import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

export interface TimelineEvent {
  id: string;
  type: 'post' | 'collaboration' | 'milestone' | 'endorsement';
  title: string;
  description?: string;
  date: Date;
  category?: string;
  metrics?: Record<string, number>;
  relatedPostId?: string;
}

export interface ImpactMetrics {
  totalViews: number;
  totalLikes: number;
  totalComments: number;
  totalBookmarks: number;
  engagementRate: number;
  reachGrowth: number;
  topPerformingPosts: any[];
  viewsByCategory: Record<string, number>;
  monthlyTrend: { month: string; views: number; engagement: number }[];
}

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  // 프로젝트 타임라인 생성
  async getProjectTimeline(userId: string): Promise<TimelineEvent[]> {
    const events: TimelineEvent[] = [];

    // 1. 포스트 이벤트
    const posts = await this.prisma.post.findMany({
      where: {
        authorId: userId,
        status: 'PUBLISHED',
      },
      include: {
        _count: {
          select: { likes: true, comments: true, bookmarks: true },
        },
      },
      orderBy: { publishedAt: 'desc' },
    });

    for (const post of posts) {
      if (post.publishedAt) {
        events.push({
          id: `post-${post.id}`,
          type: 'post',
          title: post.title,
          description: post.summary || undefined,
          date: post.publishedAt,
          category: post.category,
          metrics: {
            views: post.viewCount,
            likes: post._count.likes,
            comments: post._count.comments,
            bookmarks: post._count.bookmarks,
          },
          relatedPostId: post.id,
        });
      }
    }

    // 2. 협업 참여 이벤트
    const profile = await this.prisma.profile.findUnique({
      where: { userId },
    });

    if (profile) {
      const contributions = await this.prisma.projectContributor.findMany({
        where: { profileId: profile.id },
        include: {
          post: true,
        },
      });

      for (const contrib of contributions) {
        events.push({
          id: `collab-${contrib.id}`,
          type: 'collaboration',
          title: `${contrib.post.title} 프로젝트 참여`,
          description: `${contrib.role} 역할로 참여`,
          date: contrib.createdAt,
          category: contrib.post.category,
          relatedPostId: contrib.postId,
        });
      }
    }

    // 3. 추천 받은 이벤트
    const endorsements = await this.prisma.skillEndorsement.findMany({
      where: { endorseeId: userId },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    for (const endorsement of endorsements) {
      events.push({
        id: `endorsement-${endorsement.id}`,
        type: 'endorsement',
        title: `${endorsement.skill} 스킬 추천 받음`,
        date: endorsement.createdAt,
      });
    }

    // 날짜순 정렬
    return events.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );
  }

  // 임팩트 메트릭스 계산
  async getImpactMetrics(userId: string): Promise<ImpactMetrics> {
    const posts = await this.prisma.post.findMany({
      where: {
        authorId: userId,
        status: 'PUBLISHED',
      },
      include: {
        _count: {
          select: { likes: true, comments: true, bookmarks: true },
        },
      },
    });

    // 기본 메트릭스
    const totalViews = posts.reduce((sum, p) => sum + p.viewCount, 0);
    const totalLikes = posts.reduce((sum, p) => sum + p._count.likes, 0);
    const totalComments = posts.reduce((sum, p) => sum + p._count.comments, 0);
    const totalBookmarks = posts.reduce((sum, p) => sum + p._count.bookmarks, 0);

    // 참여율 계산
    const totalEngagement = totalLikes + totalComments + totalBookmarks;
    const engagementRate =
      totalViews > 0 ? (totalEngagement / totalViews) * 100 : 0;

    // 카테고리별 조회수
    const viewsByCategory: Record<string, number> = {};
    for (const post of posts) {
      const cat = post.category || 'OTHER';
      viewsByCategory[cat] = (viewsByCategory[cat] || 0) + post.viewCount;
    }

    // 상위 성과 포스트
    const topPerformingPosts = [...posts]
      .sort(
        (a, b) =>
          b._count.likes +
          b._count.comments -
          (a._count.likes + a._count.comments),
      )
      .slice(0, 5)
      .map((p) => ({
        id: p.id,
        title: p.title,
        views: p.viewCount,
        likes: p._count.likes,
        comments: p._count.comments,
        bookmarks: p._count.bookmarks,
        category: p.category,
      }));

    // 월별 트렌드 (최근 6개월)
    const monthlyTrend = this.calculateMonthlyTrend(posts);

    // 성장률 계산 (이전 달 대비)
    const reachGrowth = this.calculateGrowth(posts);

    return {
      totalViews,
      totalLikes,
      totalComments,
      totalBookmarks,
      engagementRate: Math.round(engagementRate * 100) / 100,
      reachGrowth,
      topPerformingPosts,
      viewsByCategory,
      monthlyTrend,
    };
  }

  private calculateMonthlyTrend(posts: any[]) {
    const now = new Date();
    const months: { month: string; views: number; engagement: number }[] = [];

    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

      const monthPosts = posts.filter((p) => {
        if (!p.publishedAt) return false;
        const pubDate = new Date(p.publishedAt);
        return (
          pubDate.getFullYear() === date.getFullYear() &&
          pubDate.getMonth() === date.getMonth()
        );
      });

      const views = monthPosts.reduce((sum, p) => sum + p.viewCount, 0);
      const engagement = monthPosts.reduce(
        (sum, p) => sum + p._count.likes + p._count.comments,
        0,
      );

      months.push({ month: monthStr, views, engagement });
    }

    return months;
  }

  private calculateGrowth(posts: any[]): number {
    const now = new Date();
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const thisMonthViews = posts
      .filter((p) => p.publishedAt && new Date(p.publishedAt) >= thisMonth)
      .reduce((sum, p) => sum + p.viewCount, 0);

    const lastMonthViews = posts
      .filter((p) => {
        if (!p.publishedAt) return false;
        const pubDate = new Date(p.publishedAt);
        return pubDate >= lastMonth && pubDate < thisMonth;
      })
      .reduce((sum, p) => sum + p.viewCount, 0);

    if (lastMonthViews === 0) return thisMonthViews > 0 ? 100 : 0;
    return Math.round(
      ((thisMonthViews - lastMonthViews) / lastMonthViews) * 100,
    );
  }

  // 포스트 상세 분석
  async getPostAnalytics(postId: string) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      include: {
        _count: {
          select: { likes: true, comments: true, bookmarks: true },
        },
        likes: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        comments: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!post) return null;

    // 기존 분석 데이터 조회 또는 생성
    let analytics = await this.prisma.postAnalytics.findUnique({
      where: { postId },
    });

    if (!analytics) {
      analytics = await this.prisma.postAnalytics.create({
        data: { postId },
      });
    }

    return {
      postId,
      title: post.title,
      metrics: {
        views: post.viewCount,
        likes: post._count.likes,
        comments: post._count.comments,
        bookmarks: post._count.bookmarks,
      },
      engagementRate:
        post.viewCount > 0
          ? ((post._count.likes + post._count.comments) / post.viewCount) * 100
          : 0,
      dailyViews: analytics.dailyViews,
      weeklyViews: analytics.weeklyViews,
      peakViewDate: analytics.peakViewDate,
      avgTimeOnPage: analytics.avgTimeOnPage,
      recentActivity: {
        likes: post.likes.map((l) => ({
          userId: l.userId,
          createdAt: l.createdAt,
        })),
        comments: post.comments.map((c) => ({
          id: c.id,
          authorId: c.authorId,
          content: c.content.substring(0, 100),
          createdAt: c.createdAt,
        })),
      },
    };
  }

  // 조회수 기록 (내부 호출용)
  async recordView(postId: string) {
    const today = new Date().toISOString().split('T')[0];

    let analytics = await this.prisma.postAnalytics.findUnique({
      where: { postId },
    });

    if (!analytics) {
      analytics = await this.prisma.postAnalytics.create({
        data: { postId },
      });
    }

    // 일일 조회수 업데이트
    const dailyViews = (analytics.dailyViews as any[]) || [];
    const todayIndex = dailyViews.findIndex((d: any) => d.date === today);

    if (todayIndex >= 0) {
      dailyViews[todayIndex].count++;
    } else {
      dailyViews.push({ date: today, count: 1 });
      // 최근 30일만 유지
      if (dailyViews.length > 30) {
        dailyViews.shift();
      }
    }

    // 피크 조회일 업데이트
    const maxViews = Math.max(...dailyViews.map((d: any) => d.count));
    const peakDay = dailyViews.find((d: any) => d.count === maxViews);

    await this.prisma.postAnalytics.update({
      where: { postId },
      data: {
        dailyViews,
        peakViewDate: peakDay ? new Date(peakDay.date) : null,
      },
    });
  }

  // 스킬별 프로젝트 분포
  async getSkillDistribution(userId: string) {
    const posts = await this.prisma.post.findMany({
      where: {
        authorId: userId,
        status: 'PUBLISHED',
      },
      select: {
        skills: true,
        techStack: true,
        _count: {
          select: { likes: true },
        },
      },
    });

    const skillMap = new Map<string, { count: number; totalLikes: number }>();

    for (const post of posts) {
      const allSkills = [...(post.skills || []), ...(post.techStack || [])];
      for (const skill of allSkills) {
        const current = skillMap.get(skill) || { count: 0, totalLikes: 0 };
        skillMap.set(skill, {
          count: current.count + 1,
          totalLikes: current.totalLikes + post._count.likes,
        });
      }
    }

    return Array.from(skillMap.entries())
      .map(([skill, data]) => ({
        skill,
        projectCount: data.count,
        totalLikes: data.totalLikes,
        avgLikes: data.count > 0 ? Math.round(data.totalLikes / data.count) : 0,
      }))
      .sort((a, b) => b.projectCount - a.projectCount);
  }
}
