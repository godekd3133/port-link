import { Injectable, Optional } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CacheService } from '../cache/cache.service';
import { Prisma } from '@prisma/client';
import { Profession, ProjectCategory } from '../common/enums';

@Injectable()
export class FeedService {
  constructor(
    private prisma: PrismaService,
    @Optional() private cache?: CacheService,
  ) {}

  async getFeed(params: {
    page?: number;
    limit?: number;
    sortBy?: 'latest' | 'popular' | 'trending';
    techStack?: string[];
    skills?: string[]; // 범용 스킬 필터
    category?: ProjectCategory; // 프로젝트 카테고리 필터
    profession?: Profession; // 작성자 직종 필터
    isTeamProject?: boolean; // 팀 프로젝트만
    isOpenToWork?: boolean; // 구직 중인 사람만
    search?: string;
  }) {
    const {
      page = 1,
      limit = 10,
      sortBy = 'latest',
      techStack,
      skills,
      category,
      profession,
      isTeamProject,
      isOpenToWork,
      search,
    } = params;
    const skip = (page - 1) * limit;

    // Generate cache key based on params (don't cache search results)
    const cacheKey = `feed:${sortBy}:${page}:${limit}:${techStack?.join(',') || ''}:${skills?.join(',') || ''}:${category || ''}:${profession || ''}:${isTeamProject || ''}`;

    // Try to get from cache (5 minutes TTL) - skip for search queries
    if (this.cache && !search && !isOpenToWork) {
      const cached = await this.cache.get<any>(cacheKey);
      if (cached) {
        return cached;
      }
    }

    // Build where clause
    const where: Prisma.PostWhereInput = {
      status: 'PUBLISHED',
    };

    // 기존 techStack 필터
    if (techStack && techStack.length > 0) {
      where.techStack = {
        hasSome: techStack,
      };
    }

    // 범용 스킬 필터
    if (skills && skills.length > 0) {
      where.skills = {
        hasSome: skills,
      };
    }

    // 프로젝트 카테고리 필터
    if (category) {
      where.category = category;
    }

    // 팀 프로젝트 필터
    if (isTeamProject !== undefined) {
      where.isTeamProject = isTeamProject;
    }

    // 작성자 직종 필터
    if (profession) {
      where.author = {
        profile: {
          profession: profession,
        },
      };
    }

    // 구직 중인 작성자 필터
    if (isOpenToWork) {
      where.author = {
        ...(where.author as any),
        profile: {
          ...(where.author as any)?.profile,
          isOpenToWork: true,
        },
      };
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { summary: { contains: search, mode: 'insensitive' } },
        { content: { contains: search, mode: 'insensitive' } },
        { skills: { hasSome: [search] } },
        { techStack: { hasSome: [search] } },
      ];
    }

    const total = await this.prisma.post.count({ where });
    const include = {
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
    };

    let posts;

    if (sortBy === 'trending') {
      // Fetch a larger candidate pool to compute engagement-based trending
      const candidateTake = Math.min(limit * 5, 200);
      const candidates = await this.prisma.post.findMany({
        where,
        take: candidateTake,
        orderBy: { publishedAt: 'desc' },
        include,
      });

      const now = Date.now();
      const scored = candidates.map((post) => {
        const engagement =
          post._count.likes * 3 + post._count.bookmarks * 4 + post._count.comments * 3;
        const viewScore = post.viewCount * 0.2;
        const ageHours = post.publishedAt
          ? (now - post.publishedAt.getTime()) / (1000 * 60 * 60)
          : 0;
        const recencyDecay = 1 / Math.log10(ageHours + 10); // soft decay, keeps recent posts higher
        const score = (engagement + viewScore) * recencyDecay;

        return { post, score };
      });

      const sorted = scored.sort((a, b) => b.score - a.score);
      const start = skip;
      const end = start + limit;
      posts = sorted.slice(start, end).map((item) => item.post);
    } else {
      // Build orderBy clause
      let orderBy: Prisma.PostOrderByWithRelationInput = {};
      switch (sortBy) {
        case 'latest':
          orderBy = { publishedAt: 'desc' };
          break;
        case 'popular':
          orderBy = { viewCount: 'desc' };
          break;
      }

      posts = await this.prisma.post.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include,
      });
    }

    const result = {
      posts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };

    // Cache the result for 5 minutes (except search results)
    if (this.cache && !search) {
      await this.cache.set(cacheKey, result, 300);
    }

    return result;
  }

  async getEditorPicks() {
    const cacheKey = 'feed:editor-picks';

    // Try cache first (10 minutes TTL)
    if (this.cache) {
      const cached = await this.cache.get<any>(cacheKey);
      if (cached) return cached;
    }

    const result = await this.prisma.post.findMany({
      where: {
        status: 'PUBLISHED',
        isEditorPick: true,
      },
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
      take: 5,
    });

    if (this.cache) {
      await this.cache.set(cacheKey, result, 600);
    }

    return result;
  }

  async getTrendingTags() {
    const cacheKey = 'feed:trending-tags';

    // Try cache first (30 minutes TTL)
    if (this.cache) {
      const cached = await this.cache.get<any>(cacheKey);
      if (cached) return cached;
    }

    const posts = await this.prisma.post.findMany({
      where: { status: 'PUBLISHED' },
      select: { techStack: true },
    });

    const tagCounts = new Map<string, number>();
    posts.forEach((post) => {
      post.techStack.forEach((tag) => {
        tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
      });
    });

    const result = Array.from(tagCounts.entries())
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20);

    if (this.cache) {
      await this.cache.set(cacheKey, result, 1800);
    }

    return result;
  }

  /**
   * Invalidate feed cache when posts are created/updated/deleted
   */
  async invalidateFeedCache() {
    if (this.cache) {
      await this.cache.delPattern('feed:*');
    }
  }
}
