import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { PrismaService } from '../database/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class CommentsService {
  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
  ) {}

  async create(postId: string, authorId: string, createCommentDto: CreateCommentDto) {
    // Check if post exists
    const post = await this.prisma.post.findUnique({ where: { id: postId } });
    if (!post) {
      throw new NotFoundException('Post not found');
    }

    if (post.status !== 'PUBLISHED') {
      throw new ForbiddenException('Cannot comment on unpublished posts');
    }

    const comment = await this.prisma.comment.create({
      data: {
        ...createCommentDto,
        postId,
        authorId,
      },
      include: {
        author: {
          include: { profile: true },
        },
      },
    });

    // Notify post author (do not notify self)
    if (post.authorId !== authorId) {
      await this.notificationsService.create({
        userId: post.authorId,
        type: 'comment',
        title: '새 댓글이 달렸어요',
        message: `${comment.author.profile?.name || '누군가'}님이 "${post.title}"에 댓글을 남겼습니다.`,
        relatedPostId: post.id,
        relatedUserId: authorId,
      });
    }

    return comment;
  }

  async findByPost(postId: string) {
    return this.prisma.comment.findMany({
      where: { postId },
      include: {
        author: {
          include: { profile: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async update(id: string, userId: string, updateCommentDto: UpdateCommentDto) {
    const comment = await this.prisma.comment.findUnique({ where: { id } });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    if (comment.authorId !== userId) {
      throw new ForbiddenException('You can only update your own comments');
    }

    return this.prisma.comment.update({
      where: { id },
      data: updateCommentDto,
    });
  }

  async remove(id: string, userId: string) {
    const comment = await this.prisma.comment.findUnique({ where: { id } });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    if (comment.authorId !== userId) {
      throw new ForbiddenException('You can only delete your own comments');
    }

    await this.prisma.comment.delete({ where: { id } });
  }
}
