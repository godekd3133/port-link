import {
  ConflictException,
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateReportDto } from './dto/create-report.dto';
import { ReportStatus } from '@prisma/client';

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  async create(reporterId: string, createReportDto: CreateReportDto) {
    const post = await this.prisma.post.findUnique({
      where: { id: createReportDto.postId },
      include: {
        author: {
          include: { profile: true },
        },
      },
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    if (post.authorId === reporterId) {
      throw new ConflictException('You cannot report your own post');
    }

    const existing = await this.prisma.report.findFirst({
      where: {
        reporterId,
        postId: createReportDto.postId,
        status: { in: [ReportStatus.PENDING, ReportStatus.REVIEWED] },
      },
    });

    if (existing) {
      throw new ConflictException('Report already submitted for this post');
    }

    return this.prisma.report.create({
      data: {
        ...createReportDto,
        reporterId,
        status: ReportStatus.PENDING,
      },
    });
  }

  async findMyReports(userId: string) {
    return this.prisma.report.findMany({
      where: { reporterId: userId },
      include: {
        post: {
          select: {
            id: true,
            title: true,
            status: true,
            author: {
              select: {
                id: true,
                profile: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getById(id: string, userId: string) {
    const report = await this.prisma.report.findUnique({
      where: { id },
      include: {
        post: {
          select: {
            id: true,
            title: true,
            status: true,
          },
        },
      },
    });

    if (!report) {
      throw new NotFoundException('Report not found');
    }

    if (report.reporterId !== userId) {
      throw new ForbiddenException('You can only view your own reports');
    }

    return report;
  }
}
