import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class BookmarksService {
  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
  ) {}

  async toggle(postId: string, userId: string) {
    // Check if post exists
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
    });
    if (!post) {
      throw new NotFoundException('Post not found');
    }

    if (post.status !== 'PUBLISHED') {
      throw new ForbiddenException('Cannot bookmark unpublished posts');
    }

    // Check if bookmark already exists
    const existingBookmark = await this.prisma.bookmark.findUnique({
      where: {
        postId_userId: {
          postId,
          userId,
        },
      },
    });

    if (existingBookmark) {
      // Remove bookmark
      await this.prisma.bookmark.delete({
        where: { id: existingBookmark.id },
      });
      return { bookmarked: false, message: 'Bookmark removed' };
    } else {
      // Add bookmark
      await this.prisma.bookmark.create({
        data: {
          postId,
          userId,
        },
      });

      if (post.authorId !== userId) {
        await this.notificationsService.create({
          userId: post.authorId,
          type: 'bookmark',
          title: '내 포스트가 북마크됐어요',
          message: `"${post.title}"이(가) 북마크되었습니다.`,
          relatedPostId: post.id,
          relatedUserId: userId,
        });
      }

      return { bookmarked: true, message: 'Post bookmarked' };
    }
  }

  async getUserBookmarks(userId: string) {
    return this.prisma.bookmark.findMany({
      where: { userId },
      include: {
        post: {
          include: {
            author: {
              include: { profile: true },
            },
            _count: {
              select: {
                likes: true,
                comments: true,
                bookmarks: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async checkUserBookmarked(postId: string, userId: string) {
    const bookmark = await this.prisma.bookmark.findUnique({
      where: {
        postId_userId: {
          postId,
          userId,
        },
      },
    });

    return { bookmarked: !!bookmark };
  }
}
