import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getStats(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: true,
        posts: {
          where: { status: 'PUBLISHED' },
          include: {
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
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const totalViews = user.posts.reduce((sum, post) => sum + post.viewCount, 0);
    const totalLikes = user.posts.reduce((sum, post) => sum + post._count.likes, 0);
    const totalComments = user.posts.reduce((sum, post) => sum + post._count.comments, 0);
    const totalBookmarks = user.posts.reduce((sum, post) => sum + post._count.bookmarks, 0);

    return {
      overview: {
        totalPosts: user.posts.length,
        totalViews,
        totalLikes,
        totalComments,
        totalBookmarks,
      },
      posts: user.posts.map((post) => ({
        id: post.id,
        title: post.title,
        viewCount: post.viewCount,
        likeCount: post._count.likes,
        commentCount: post._count.comments,
        bookmarkCount: post._count.bookmarks,
        publishedAt: post.publishedAt,
      })),
    };
  }

  async getPostStats(postId: string, userId: string) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      include: {
        _count: {
          select: {
            likes: true,
            comments: true,
            bookmarks: true,
          },
        },
      },
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    if (post.authorId !== userId) {
      throw new ForbiddenException('You can only view stats for your own posts');
    }

    // Get daily views for the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    return {
      post: {
        id: post.id,
        title: post.title,
        viewCount: post.viewCount,
        likeCount: post._count.likes,
        commentCount: post._count.comments,
        bookmarkCount: post._count.bookmarks,
        publishedAt: post.publishedAt,
      },
    };
  }

  async getEngagementStats(userId: string) {
    const [likedPosts, bookmarkedPosts, comments] = await Promise.all([
      this.prisma.like.count({ where: { userId } }),
      this.prisma.bookmark.count({ where: { userId } }),
      this.prisma.comment.count({ where: { authorId: userId } }),
    ]);

    return {
      likedPosts,
      bookmarkedPosts,
      commentsWritten: comments,
    };
  }
}
