import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class ProfilesService {
  constructor(private prisma: PrismaService) {}

  async findByUserId(userId: string) {
    return this.prisma.profile.findUnique({
      where: { userId },
    });
  }

  async update(userId: string, updateProfileDto: UpdateProfileDto) {
    return this.prisma.profile.update({
      where: { userId },
      data: updateProfileDto,
    });
  }

  async findPublicProfile(userId: string) {
    const profile = await this.prisma.profile.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            id: true,
            email: false,
            createdAt: true,
            posts: {
              where: { status: 'PUBLISHED' },
              select: {
                id: true,
                title: true,
                summary: true,
                coverImage: true,
                media: true,
                techStack: true,
                viewCount: true,
                status: true,
                publishedAt: true,
                _count: {
                  select: {
                    likes: true,
                    comments: true,
                    bookmarks: true,
                  },
                },
              },
              orderBy: { publishedAt: 'desc' },
            },
          },
        },
      },
    });

    if (!profile) {
      throw new NotFoundException('Profile not found');
    }

    return profile;
  }
}
