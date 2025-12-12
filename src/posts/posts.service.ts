import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';

@Injectable()
export class PostsService {
  constructor(private prisma: PrismaService) {}

  async create(authorId: string, createPostDto: CreatePostDto) {
    const data: any = {
      authorId,
      title: createPostDto.title,
      content: createPostDto.content,
      summary: createPostDto.summary,
      coverImage: createPostDto.coverImage,
      techStack: createPostDto.techStack || [],
      media: createPostDto.media || [],
      repositoryUrl: createPostDto.repositoryUrl,
      demoUrl: createPostDto.demoUrl,
      status: createPostDto.status || 'DRAFT',
      publishedAt: createPostDto.status === 'PUBLISHED' ? new Date() : null,
      // 새 필드들
      category: createPostDto.category,
      skills: createPostDto.skills || [],
      behanceUrl: createPostDto.behanceUrl,
      figmaUrl: createPostDto.figmaUrl,
      youtubeUrl: createPostDto.youtubeUrl,
      externalUrl: createPostDto.externalUrl,
      isTeamProject: createPostDto.isTeamProject || false,
      projectStartDate: createPostDto.projectStartDate
        ? new Date(createPostDto.projectStartDate)
        : null,
      projectEndDate: createPostDto.projectEndDate ? new Date(createPostDto.projectEndDate) : null,
    };

    // Remove undefined fields
    Object.keys(data).forEach((key) => {
      if (data[key] === undefined) {
        delete data[key];
      }
    });

    // 팀 프로젝트 협업자 처리
    const contributors = createPostDto.contributors;

    const post = await this.prisma.post.create({
      data,
      include: {
        author: {
          include: { profile: true },
        },
        contributors: {
          include: { profile: true },
        },
      },
    });

    // 협업자가 있으면 추가
    if (contributors && contributors.length > 0) {
      // profileIdOrUsername을 profileId로 변환
      const contributorData = await Promise.all(
        contributors.map(async (c) => {
          let profileId = c.profileIdOrUsername;

          // username인 경우 profile ID 조회
          const profile = await this.prisma.profile.findFirst({
            where: {
              OR: [{ id: c.profileIdOrUsername }, { username: c.profileIdOrUsername }],
            },
          });

          if (profile) {
            profileId = profile.id;
          }

          return {
            postId: post.id,
            profileId,
            role: c.role,
            profession: c.profession,
            contribution: c.contribution,
          };
        }),
      );

      await this.prisma.projectContributor.createMany({
        data: contributorData,
        skipDuplicates: true,
      });

      // 협업자 포함해서 다시 조회
      return this.prisma.post.findUnique({
        where: { id: post.id },
        include: {
          author: { include: { profile: true } },
          contributors: {
            include: { profile: true },
          },
        },
      });
    }

    return post;
  }

  async findAll(status?: string) {
    return this.prisma.post.findMany({
      where: status ? { status: status as any } : { status: 'PUBLISHED' },
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
      orderBy: { publishedAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const include = {
      author: {
        include: { profile: true },
      },
      contributors: {
        include: { profile: true },
      },
      _count: {
        select: {
          likes: true,
          comments: true,
          bookmarks: true,
        },
      },
    };

    const post = await this.prisma.$transaction(async (tx) => {
      const existing = await tx.post.findUnique({
        where: { id },
        include,
      });

      if (!existing) {
        throw new NotFoundException('Post not found');
      }

      return tx.post.update({
        where: { id },
        data: { viewCount: { increment: 1 } },
        include,
      });
    });

    return post;
  }

  async update(id: string, userId: string, updatePostDto: UpdatePostDto) {
    const post = await this.prisma.post.findUnique({ where: { id } });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    if (post.authorId !== userId) {
      throw new ForbiddenException('You can only update your own posts');
    }

    const data: any = { ...updatePostDto };
    if (updatePostDto.status) {
      if (updatePostDto.status === 'PUBLISHED' && !post.publishedAt) {
        data.publishedAt = new Date();
      } else if (updatePostDto.status !== 'PUBLISHED') {
        data.publishedAt = null;
      }
    }

    return this.prisma.post.update({
      where: { id },
      data,
    });
  }

  async remove(id: string, userId: string) {
    const post = await this.prisma.post.findUnique({ where: { id } });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    if (post.authorId !== userId) {
      throw new ForbiddenException('You can only delete your own posts');
    }

    await this.prisma.post.delete({ where: { id } });
  }

  async findByAuthor(authorId: string) {
    return this.prisma.post.findMany({
      where: { authorId },
      include: {
        _count: {
          select: {
            likes: true,
            comments: true,
            bookmarks: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
