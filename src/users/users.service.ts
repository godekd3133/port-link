import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { suggestUsername, isValidUsername, normalizeUsername } from '../mentions/mention.utils';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async create(data: { email: string; password: string; name: string; username?: string }) {
    const exists = await this.prisma.user.findUnique({
      where: { email: data.email },
    });

    if (exists) {
      throw new ConflictException('Email already exists');
    }

    // Generate or validate username
    let username = data.username;
    if (username) {
      username = normalizeUsername(username);
      if (!isValidUsername(username)) {
        throw new ConflictException('Invalid username format');
      }
      const usernameExists = await this.prisma.profile.findUnique({
        where: { username },
      });
      if (usernameExists) {
        throw new ConflictException('Username already taken');
      }
    } else {
      // Auto-generate username from name or email
      const existingUsernames = await this.prisma.profile.findMany({
        select: { username: true },
      });
      const usernameSet = new Set(existingUsernames.map((p) => p.username));
      const baseName = data.name || data.email.split('@')[0];
      username = suggestUsername(baseName, usernameSet);
    }

    const user = await this.prisma.user.create({
      data: {
        email: data.email,
        password: data.password,
        profile: {
          create: {
            name: data.name,
            username,
          },
        },
      },
      include: {
        profile: true,
      },
    });

    return user;
  }

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
      include: { profile: true },
    });
  }

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: { profile: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async findAll() {
    return this.prisma.user.findMany({
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true,
        profile: true,
      },
    });
  }
}
