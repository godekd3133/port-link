import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class LikesService {
  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
  ) {}

  async toggle(postId: string, userId: string) {
    // Check if post exists
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      include: {
        author: {
          include: { profile: true },
        },
      },
    });
    if (!post) {
      throw new NotFoundException('Post not found');
    }

    if (post.status !== 'PUBLISHED') {
      throw new ForbiddenException('Cannot like unpublished posts');
    }

    // Check if like already exists
    const existingLike = await this.prisma.like.findUnique({
      where: {
        postId_userId: {
          postId,
          userId,
        },
      },
    });

    if (existingLike) {
      // Unlike
      await this.prisma.like.delete({
        where: { id: existingLike.id },
      });
      return { liked: false, message: 'Post unliked' };
    } else {
      // Like
      await this.prisma.like.create({
        data: {
          postId,
          userId,
        },
      });

      if (post.authorId !== userId) {
        await this.notificationsService.create({
          userId: post.authorId,
          type: 'like',
          title: '새 좋아요',
          message: `"${post.title}"에 새 좋아요가 달렸습니다.`,
          relatedPostId: post.id,
          relatedUserId: userId,
        });
      }

      return { liked: true, message: 'Post liked' };
    }
  }

  async getPostLikes(postId: string) {
    const likes = await this.prisma.like.findMany({
      where: { postId },
      include: {
        user: {
          include: { profile: true },
        },
      },
    });

    return {
      count: likes.length,
      users: likes.map((like) => ({
        id: like.user.id,
        name: like.user.profile?.name,
        avatar: like.user.profile?.avatar,
      })),
    };
  }

  async getUserLikes(userId: string) {
    return this.prisma.like.findMany({
      where: { userId },
      include: {
        post: {
          include: {
            author: {
              include: { profile: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async checkUserLiked(postId: string, userId: string) {
    const like = await this.prisma.like.findUnique({
      where: {
        postId_userId: {
          postId,
          userId,
        },
      },
    });

    return { liked: !!like };
  }
}
