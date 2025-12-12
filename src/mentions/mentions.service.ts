import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { WebSocketService } from '../websocket/websocket.service';
import { extractMentions } from './mention.utils';

@Injectable()
export class MentionsService {
  private readonly logger = new Logger(MentionsService.name);

  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
    private webSocketService: WebSocketService,
  ) {}

  /**
   * Process mentions in a post
   * Extracts @usernames, creates mention records, and sends notifications
   */
  async processMentionsInPost(
    authorId: string,
    postId: string,
    content: string,
    postTitle: string,
  ) {
    const usernames = extractMentions(content);
    if (usernames.length === 0) return [];

    const author = await this.prisma.user.findUnique({
      where: { id: authorId },
      include: { profile: true },
    });

    const authorName = author?.profile?.name || 'Someone';

    // Find users by username
    const mentionedProfiles = await this.prisma.profile.findMany({
      where: {
        username: { in: usernames },
      },
      include: { user: true },
    });

    const mentions = [];

    for (const profile of mentionedProfiles) {
      // Don't notify yourself
      if (profile.userId === authorId) continue;

      // Create mention record
      const mention = await this.prisma.mention.create({
        data: {
          authorId,
          mentionedUserId: profile.userId,
          postId,
        },
      });
      mentions.push(mention);

      // Create notification
      await this.notificationsService.create({
        userId: profile.userId,
        type: 'mention',
        title: 'You were mentioned',
        message: `${authorName} mentioned you in "${postTitle}"`,
        relatedPostId: postId,
        relatedUserId: authorId,
      });

      // Send real-time notification
      this.webSocketService.sendNotificationToUser(profile.userId, {
        id: `mention-post-${Date.now()}`,
        type: 'mention',
        title: 'You were mentioned',
        message: `${authorName} mentioned you in "${postTitle}"`,
        relatedPostId: postId,
        relatedUserId: authorId,
        createdAt: new Date(),
      });

      this.logger.log(`User ${profile.username} was mentioned in post ${postId}`);
    }

    return mentions;
  }

  /**
   * Process mentions in a comment
   * Extracts @usernames, creates mention records, and sends notifications
   */
  async processMentionsInComment(
    authorId: string,
    commentId: string,
    postId: string,
    content: string,
  ) {
    const usernames = extractMentions(content);
    if (usernames.length === 0) return [];

    const [author, post] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: authorId },
        include: { profile: true },
      }),
      this.prisma.post.findUnique({
        where: { id: postId },
        select: { title: true },
      }),
    ]);

    const authorName = author?.profile?.name || 'Someone';
    const postTitle = post?.title || 'a post';

    // Find users by username
    const mentionedProfiles = await this.prisma.profile.findMany({
      where: {
        username: { in: usernames },
      },
      include: { user: true },
    });

    const mentions = [];

    for (const profile of mentionedProfiles) {
      // Don't notify yourself
      if (profile.userId === authorId) continue;

      // Create mention record
      const mention = await this.prisma.mention.create({
        data: {
          authorId,
          mentionedUserId: profile.userId,
          commentId,
        },
      });
      mentions.push(mention);

      // Create notification
      await this.notificationsService.create({
        userId: profile.userId,
        type: 'mention',
        title: 'You were mentioned in a comment',
        message: `${authorName} mentioned you in a comment on "${postTitle}"`,
        relatedPostId: postId,
        relatedUserId: authorId,
      });

      // Send real-time notification
      this.webSocketService.sendNotificationToUser(profile.userId, {
        id: `mention-comment-${Date.now()}`,
        type: 'mention',
        title: 'You were mentioned in a comment',
        message: `${authorName} mentioned you in a comment on "${postTitle}"`,
        relatedPostId: postId,
        relatedUserId: authorId,
        createdAt: new Date(),
      });

      this.logger.log(`User ${profile.username} was mentioned in comment ${commentId}`);
    }

    return mentions;
  }

  /**
   * Get mentions for a user
   */
  async getMentionsForUser(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [mentions, total] = await Promise.all([
      this.prisma.mention.findMany({
        where: { mentionedUserId: userId },
        include: {
          author: {
            include: { profile: true },
          },
          post: {
            select: { id: true, title: true },
          },
          comment: {
            select: { id: true, content: true, postId: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.mention.count({
        where: { mentionedUserId: userId },
      }),
    ]);

    return {
      data: mentions,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Search users by username (for autocomplete)
   */
  async searchUsersByUsername(query: string, limit = 10) {
    if (!query || query.length < 1) return [];

    const profiles = await this.prisma.profile.findMany({
      where: {
        username: {
          startsWith: query.toLowerCase(),
        },
      },
      include: {
        user: {
          select: { id: true, email: true },
        },
      },
      take: limit,
    });

    return profiles.map((p) => ({
      userId: p.userId,
      username: p.username,
      name: p.name,
      avatar: p.avatar,
    }));
  }

  /**
   * Check if a username is available
   */
  async isUsernameAvailable(username: string): Promise<boolean> {
    const existing = await this.prisma.profile.findUnique({
      where: { username: username.toLowerCase() },
    });
    return !existing;
  }
}
