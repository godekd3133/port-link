import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { WebSocketService } from '../websocket/websocket.service';

@Injectable()
export class FollowsService {
  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
    private webSocketService: WebSocketService,
  ) {}

  /**
   * Follow a user
   */
  async follow(followerId: string, followingId: string) {
    // Can't follow yourself
    if (followerId === followingId) {
      throw new BadRequestException('You cannot follow yourself');
    }

    // Check if target user exists
    const targetUser = await this.prisma.user.findUnique({
      where: { id: followingId },
      include: { profile: true },
    });

    if (!targetUser) {
      throw new NotFoundException('User not found');
    }

    // Check if already following
    const existingFollow = await this.prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId,
          followingId,
        },
      },
    });

    if (existingFollow) {
      throw new ConflictException('Already following this user');
    }

    // Create follow relationship
    const follow = await this.prisma.follow.create({
      data: {
        followerId,
        followingId,
      },
      include: {
        follower: {
          include: { profile: true },
        },
        following: {
          include: { profile: true },
        },
      },
    });

    // Create notification for the followed user
    const followerName = follow.follower.profile?.name || 'Someone';
    await this.notificationsService.create({
      userId: followingId,
      type: 'follow',
      title: 'New Follower',
      message: `${followerName} started following you`,
      relatedUserId: followerId,
    });

    // Send real-time notification
    this.webSocketService.sendNotificationToUser(followingId, {
      id: `follow-${Date.now()}`,
      type: 'follow',
      title: 'New Follower',
      message: `${followerName} started following you`,
      relatedUserId: followerId,
      createdAt: new Date(),
    });

    return follow;
  }

  /**
   * Unfollow a user
   */
  async unfollow(followerId: string, followingId: string) {
    const follow = await this.prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId,
          followingId,
        },
      },
    });

    if (!follow) {
      throw new NotFoundException('Follow relationship not found');
    }

    await this.prisma.follow.delete({
      where: { id: follow.id },
    });

    return { success: true, message: 'Unfollowed successfully' };
  }

  /**
   * Get followers of a user
   */
  async getFollowers(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [followers, total] = await Promise.all([
      this.prisma.follow.findMany({
        where: { followingId: userId },
        include: {
          follower: {
            include: { profile: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.follow.count({
        where: { followingId: userId },
      }),
    ]);

    return {
      data: followers.map((f) => ({
        id: f.follower.id,
        email: f.follower.email,
        profile: f.follower.profile,
        followedAt: f.createdAt,
      })),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get users that a user is following
   */
  async getFollowing(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [following, total] = await Promise.all([
      this.prisma.follow.findMany({
        where: { followerId: userId },
        include: {
          following: {
            include: { profile: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.follow.count({
        where: { followerId: userId },
      }),
    ]);

    return {
      data: following.map((f) => ({
        id: f.following.id,
        email: f.following.email,
        profile: f.following.profile,
        followedAt: f.createdAt,
      })),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Check if user A is following user B
   */
  async isFollowing(followerId: string, followingId: string): Promise<boolean> {
    const follow = await this.prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId,
          followingId,
        },
      },
    });

    return !!follow;
  }

  /**
   * Get follow stats for a user
   */
  async getFollowStats(userId: string) {
    const [followersCount, followingCount] = await Promise.all([
      this.prisma.follow.count({ where: { followingId: userId } }),
      this.prisma.follow.count({ where: { followerId: userId } }),
    ]);

    return {
      followersCount,
      followingCount,
    };
  }

  /**
   * Get mutual followers (users that both follow each other)
   */
  async getMutualFollowers(userId: string, otherUserId: string) {
    // Get followers of userId who are also followers of otherUserId
    const userFollowers = await this.prisma.follow.findMany({
      where: { followingId: userId },
      select: { followerId: true },
    });

    const otherUserFollowers = await this.prisma.follow.findMany({
      where: { followingId: otherUserId },
      select: { followerId: true },
    });

    const userFollowerIds = new Set(userFollowers.map((f) => f.followerId));
    const mutualIds = otherUserFollowers
      .filter((f) => userFollowerIds.has(f.followerId))
      .map((f) => f.followerId);

    const mutualUsers = await this.prisma.user.findMany({
      where: { id: { in: mutualIds } },
      include: { profile: true },
    });

    return mutualUsers;
  }

  /**
   * Get suggested users to follow based on who your followers follow
   */
  async getSuggestedUsers(userId: string, limit = 10) {
    // Get who you're following
    const following = await this.prisma.follow.findMany({
      where: { followerId: userId },
      select: { followingId: true },
    });
    const followingIds = following.map((f) => f.followingId);
    followingIds.push(userId); // Exclude self

    // Get who your followers follow (that you don't already follow)
    const suggestions = await this.prisma.user.findMany({
      where: {
        id: { notIn: followingIds },
        followers: {
          some: {
            followerId: { in: followingIds.filter((id) => id !== userId) },
          },
        },
      },
      include: {
        profile: true,
        _count: {
          select: { followers: true },
        },
      },
      orderBy: {
        followers: { _count: 'desc' },
      },
      take: limit,
    });

    return suggestions;
  }
}
