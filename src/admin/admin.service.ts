import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { ReportStatus } from '@prisma/client';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class AdminService {
  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
  ) {}

  async listReports(status?: ReportStatus) {
    return this.prisma.report.findMany({
      where: status ? { status } : undefined,
      include: {
        reporter: {
          include: { profile: true },
        },
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

  async getReport(id: string) {
    const report = await this.prisma.report.findUnique({
      where: { id },
      include: {
        reporter: {
          include: { profile: true },
        },
        post: {
          include: {
            author: {
              include: { profile: true },
            },
          },
        },
      },
    });

    if (!report) {
      throw new NotFoundException('Report not found');
    }

    return report;
  }

  async handleReport(id: string, action: 'hide' | 'keep', adminNote?: string) {
    const report = await this.prisma.report.findUnique({
      where: { id },
      include: { post: true },
    });

    if (!report) {
      throw new NotFoundException('Report not found');
    }

    // Update report status
    await this.prisma.report.update({
      where: { id },
      data: {
        status: 'RESOLVED',
        adminNote,
      },
    });

    // If action is hide, hide the post
    if (action === 'hide') {
      await this.prisma.post.update({
        where: { id: report.postId },
        data: { status: 'HIDDEN' },
      });
    }

    // Notify reporter
    await this.notificationsService.create({
      userId: report.reporterId,
      type: 'report',
      title: '신고가 처리되었습니다',
      message:
        action === 'hide'
          ? '신고된 게시물이 숨김 처리되었습니다.'
          : '검토 결과 게시물이 유지됩니다.',
      relatedPostId: report.postId,
    });

    // Notify post author if hidden
    if (action === 'hide' && report.post?.authorId) {
      await this.notificationsService.create({
        userId: report.post.authorId,
        type: 'report',
        title: '게시물이 숨김 처리되었습니다',
        message: '관리자 검토 결과 게시물이 숨김 처리되었습니다.',
        relatedPostId: report.postId,
      });
    }

    return { message: `Report handled: ${action}` };
  }

  async setEditorPick(postId: string, isEditorPick: boolean) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    return this.prisma.post.update({
      where: { id: postId },
      data: { isEditorPick },
    });
  }

  async getUserStats() {
    const [totalUsers, totalPosts, totalComments] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.post.count(),
      this.prisma.comment.count(),
    ]);

    const recentUsers = await this.prisma.user.count({
      where: {
        createdAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
        },
      },
    });

    return {
      totalUsers,
      totalPosts,
      totalComments,
      recentUsers,
    };
  }
}
