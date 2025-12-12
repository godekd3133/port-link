import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

export interface SkillTrend {
  skill: string;
  demandScore: number;
  trend: 'rising' | 'stable' | 'declining';
  relatedProfessions: string[];
  avgSalaryImpact?: string;
}

export interface CareerInsight {
  profileStrength: number;
  marketPosition: string;
  skillGaps: string[];
  recommendedSkills: SkillTrend[];
  careerPathSuggestions: string[];
  industryInsights: {
    topSkillsInProfession: string[];
    averageProjects: number;
    topCategories: string[];
  };
  competitorAnalysis: {
    avgSkillCount: number;
    avgProjectCount: number;
    avgEndorsements: number;
    yourRank: string;
  };
}

@Injectable()
export class InsightsService {
  constructor(private prisma: PrismaService) {}

  // 커리어 인사이트 종합 분석
  async getCareerInsights(userId: string): Promise<CareerInsight> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: true,
        posts: {
          where: { status: 'PUBLISHED' },
        },
      },
    });

    if (!user?.profile) {
      return this.getDefaultInsights();
    }

    const profile = user.profile;
    const posts = user.posts;
    const mySkills = [...(profile.skills || []), ...(profile.techStack || [])];

    // 1. 같은 직종의 다른 사용자들 분석
    const peersData = await this.analyzePeers(profile.profession, userId);

    // 2. 프로필 강점 점수
    const profileStrength = this.calculateProfileStrength(profile, posts);

    // 3. 시장 포지션 분석
    const marketPosition = this.determineMarketPosition(
      profileStrength,
      posts.length,
      peersData,
    );

    // 4. 스킬 갭 분석
    const skillGaps = this.analyzeSkillGaps(mySkills, peersData.topSkills);

    // 5. 추천 스킬
    const recommendedSkills = await this.getRecommendedSkills(
      profile.profession,
      mySkills,
    );

    // 6. 커리어 패스 제안
    const careerPathSuggestions = this.suggestCareerPaths(
      profile.profession,
      mySkills,
      profile.yearsOfExperience || 0,
    );

    // 7. 경쟁 분석
    const competitorAnalysis = {
      avgSkillCount: peersData.avgSkillCount,
      avgProjectCount: peersData.avgProjectCount,
      avgEndorsements: peersData.avgEndorsements,
      yourRank: this.calculateRank(profileStrength, peersData.strengthDistribution),
    };

    return {
      profileStrength,
      marketPosition,
      skillGaps,
      recommendedSkills,
      careerPathSuggestions,
      industryInsights: {
        topSkillsInProfession: peersData.topSkills.slice(0, 10),
        averageProjects: peersData.avgProjectCount,
        topCategories: peersData.topCategories,
      },
      competitorAnalysis,
    };
  }

  // 동종 업계 분석
  private async analyzePeers(profession: string, excludeUserId: string) {
    const peers = await this.prisma.profile.findMany({
      where: {
        profession: profession as any,
        userId: { not: excludeUserId },
      },
      include: {
        user: {
          include: {
            posts: { where: { status: 'PUBLISHED' } },
          },
        },
      },
    });

    // 스킬 빈도 분석
    const skillFrequency = new Map<string, number>();
    let totalSkills = 0;
    let totalProjects = 0;
    const categoryCount = new Map<string, number>();
    const strengthScores: number[] = [];

    for (const peer of peers) {
      const skills = [...(peer.skills || []), ...(peer.techStack || [])];
      for (const skill of skills) {
        skillFrequency.set(skill, (skillFrequency.get(skill) || 0) + 1);
      }
      totalSkills += skills.length;
      totalProjects += peer.user.posts.length;

      for (const post of peer.user.posts) {
        const cat = post.category || 'OTHER';
        categoryCount.set(cat, (categoryCount.get(cat) || 0) + 1);
      }

      // 각 프로필 강점 점수
      const strength = this.calculateProfileStrength(peer, peer.user.posts);
      strengthScores.push(strength);
    }

    const peerCount = peers.length || 1;

    // 상위 스킬 정렬
    const topSkills = Array.from(skillFrequency.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([skill]) => skill);

    // 상위 카테고리
    const topCategories = Array.from(categoryCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([cat]) => cat);

    // 추천 수 평균 (간단히 0으로 설정, 실제 구현 시 조회 필요)
    const avgEndorsements = 0;

    return {
      topSkills,
      topCategories,
      avgSkillCount: Math.round(totalSkills / peerCount),
      avgProjectCount: Math.round(totalProjects / peerCount),
      avgEndorsements,
      strengthDistribution: strengthScores,
    };
  }

  // 프로필 강점 점수 계산
  private calculateProfileStrength(profile: any, posts: any[]): number {
    let score = 0;

    // 기본 정보 (최대 20점)
    if (profile.name) score += 5;
    if (profile.bio && profile.bio.length > 50) score += 10;
    if (profile.avatar) score += 5;

    // 스킬 (최대 25점)
    const skillCount = (profile.skills?.length || 0) + (profile.techStack?.length || 0);
    score += Math.min(skillCount * 3, 25);

    // 프로젝트 (최대 30점)
    score += Math.min(posts.length * 6, 30);

    // 소셜/링크 (최대 15점)
    const links = [
      profile.githubUrl,
      profile.websiteUrl,
      profile.linkedinUrl,
      profile.behanceUrl,
      profile.dribbbleUrl,
    ].filter(Boolean);
    score += Math.min(links.length * 3, 15);

    // 경력 (최대 10점)
    if (profile.yearsOfExperience) {
      score += Math.min(profile.yearsOfExperience, 10);
    }

    return Math.min(score, 100);
  }

  // 시장 포지션 결정
  private determineMarketPosition(
    strength: number,
    projectCount: number,
    peersData: any,
  ): string {
    const avgStrength =
      peersData.strengthDistribution.length > 0
        ? peersData.strengthDistribution.reduce((a: number, b: number) => a + b, 0) /
          peersData.strengthDistribution.length
        : 50;

    if (strength >= 80 && projectCount >= 5) {
      return '업계 리더 - 풍부한 포트폴리오와 강력한 프로필';
    } else if (strength >= 60) {
      return '성장하는 전문가 - 좋은 기반, 더 많은 프로젝트로 성장 가능';
    } else if (strength >= avgStrength) {
      return '평균 이상 - 경쟁력 있는 위치';
    } else {
      return '성장 필요 - 프로필 보강과 프로젝트 추가 권장';
    }
  }

  // 스킬 갭 분석
  private analyzeSkillGaps(mySkills: string[], topSkills: string[]): string[] {
    const mySkillsLower = mySkills.map((s) => s.toLowerCase());
    return topSkills
      .filter(
        (skill) =>
          !mySkillsLower.includes(skill.toLowerCase()),
      )
      .slice(0, 5);
  }

  // 추천 스킬
  private async getRecommendedSkills(
    profession: string,
    currentSkills: string[],
  ): Promise<SkillTrend[]> {
    // 직종별 트렌딩 스킬 (실제 구현 시 DB 또는 외부 API 활용)
    const trendingSkills: Record<string, SkillTrend[]> = {
      DEVELOPER: [
        { skill: 'TypeScript', demandScore: 95, trend: 'rising', relatedProfessions: ['DEVELOPER'] },
        { skill: 'React', demandScore: 92, trend: 'stable', relatedProfessions: ['DEVELOPER', 'DESIGNER'] },
        { skill: 'Next.js', demandScore: 88, trend: 'rising', relatedProfessions: ['DEVELOPER'] },
        { skill: 'Docker', demandScore: 85, trend: 'stable', relatedProfessions: ['DEVELOPER'] },
        { skill: 'Kubernetes', demandScore: 80, trend: 'rising', relatedProfessions: ['DEVELOPER'] },
        { skill: 'AI/ML', demandScore: 90, trend: 'rising', relatedProfessions: ['DEVELOPER', 'DATA_ANALYST'] },
      ],
      DESIGNER: [
        { skill: 'Figma', demandScore: 98, trend: 'stable', relatedProfessions: ['DESIGNER'] },
        { skill: 'Framer', demandScore: 85, trend: 'rising', relatedProfessions: ['DESIGNER'] },
        { skill: 'Motion Design', demandScore: 82, trend: 'rising', relatedProfessions: ['DESIGNER', 'VIDEO_CREATOR'] },
        { skill: 'Design Systems', demandScore: 88, trend: 'rising', relatedProfessions: ['DESIGNER'] },
        { skill: 'Prototyping', demandScore: 90, trend: 'stable', relatedProfessions: ['DESIGNER'] },
      ],
      PM: [
        { skill: 'Agile/Scrum', demandScore: 92, trend: 'stable', relatedProfessions: ['PM', 'DEVELOPER'] },
        { skill: 'Data Analysis', demandScore: 88, trend: 'rising', relatedProfessions: ['PM', 'DATA_ANALYST'] },
        { skill: 'User Research', demandScore: 85, trend: 'rising', relatedProfessions: ['PM', 'DESIGNER'] },
        { skill: 'SQL', demandScore: 80, trend: 'stable', relatedProfessions: ['PM', 'DATA_ANALYST'] },
        { skill: 'Product Strategy', demandScore: 90, trend: 'rising', relatedProfessions: ['PM'] },
      ],
      DATA_ANALYST: [
        { skill: 'Python', demandScore: 95, trend: 'stable', relatedProfessions: ['DATA_ANALYST', 'DEVELOPER'] },
        { skill: 'SQL', demandScore: 92, trend: 'stable', relatedProfessions: ['DATA_ANALYST'] },
        { skill: 'Tableau', demandScore: 85, trend: 'stable', relatedProfessions: ['DATA_ANALYST'] },
        { skill: 'Machine Learning', demandScore: 88, trend: 'rising', relatedProfessions: ['DATA_ANALYST'] },
        { skill: 'dbt', demandScore: 78, trend: 'rising', relatedProfessions: ['DATA_ANALYST'] },
      ],
      MARKETER: [
        { skill: 'Google Analytics', demandScore: 90, trend: 'stable', relatedProfessions: ['MARKETER'] },
        { skill: 'SEO/SEM', demandScore: 88, trend: 'stable', relatedProfessions: ['MARKETER', 'CONTENT_CREATOR'] },
        { skill: 'A/B Testing', demandScore: 82, trend: 'rising', relatedProfessions: ['MARKETER', 'PM'] },
        { skill: 'Marketing Automation', demandScore: 85, trend: 'rising', relatedProfessions: ['MARKETER'] },
        { skill: 'Content Strategy', demandScore: 80, trend: 'rising', relatedProfessions: ['MARKETER', 'WRITER'] },
      ],
    };

    const professionSkills = trendingSkills[profession] || [];
    const currentSkillsLower = currentSkills.map((s) => s.toLowerCase());

    // 현재 없는 스킬만 추천
    return professionSkills.filter(
      (s) => !currentSkillsLower.includes(s.skill.toLowerCase()),
    );
  }

  // 커리어 패스 제안
  private suggestCareerPaths(
    profession: string,
    skills: string[],
    yearsOfExperience: number,
  ): string[] {
    const suggestions: string[] = [];

    if (yearsOfExperience < 3) {
      suggestions.push('현재 직종의 전문성을 깊게 쌓는 것을 추천합니다');
      suggestions.push('사이드 프로젝트를 통해 포트폴리오를 강화하세요');
    } else if (yearsOfExperience < 7) {
      suggestions.push('리더십 역할에 도전해보세요 (팀 리드, 프로젝트 리더)');
      suggestions.push('멘토링을 통해 지식을 공유하고 네트워크를 확장하세요');
    } else {
      suggestions.push('시니어/아키텍트 역할로의 성장을 고려하세요');
      suggestions.push('창업 또는 컨설팅 경력도 검토해볼 만합니다');
    }

    // 직종별 특화 제안
    const professionPaths: Record<string, string[]> = {
      DEVELOPER: [
        '풀스택 개발자로 범위 확장',
        'DevOps/SRE 전문가로 전환',
        'AI/ML 엔지니어로 특화',
      ],
      DESIGNER: [
        '제품 디자이너로 범위 확장',
        'UX 리서처로 전문화',
        '디자인 시스템 전문가로 성장',
      ],
      PM: [
        '제품 전략가로 성장',
        '그로스 해커로 전환',
        'C레벨 경영진으로 도약',
      ],
      DATA_ANALYST: [
        '데이터 사이언티스트로 성장',
        'ML 엔지니어로 전환',
        '비즈니스 인텔리전스 리드로 도약',
      ],
    };

    const pathSuggestions = professionPaths[profession] || [];
    suggestions.push(...pathSuggestions.slice(0, 2));

    return suggestions;
  }

  // 순위 계산
  private calculateRank(strength: number, distribution: number[]): string {
    if (distribution.length === 0) return '측정 불가';

    const betterThan = distribution.filter((s) => strength > s).length;
    const percentile = Math.round((betterThan / distribution.length) * 100);

    if (percentile >= 90) return '상위 10%';
    if (percentile >= 75) return '상위 25%';
    if (percentile >= 50) return '상위 50%';
    if (percentile >= 25) return '상위 75%';
    return '하위 25%';
  }

  // 기본 인사이트 (프로필 없을 때)
  private getDefaultInsights(): CareerInsight {
    return {
      profileStrength: 0,
      marketPosition: '프로필 작성이 필요합니다',
      skillGaps: [],
      recommendedSkills: [],
      careerPathSuggestions: ['먼저 프로필을 완성해주세요'],
      industryInsights: {
        topSkillsInProfession: [],
        averageProjects: 0,
        topCategories: [],
      },
      competitorAnalysis: {
        avgSkillCount: 0,
        avgProjectCount: 0,
        avgEndorsements: 0,
        yourRank: '측정 불가',
      },
    };
  }

  // 스킬 트렌드 조회
  async getSkillTrends(profession?: string): Promise<SkillTrend[]> {
    // 전체 플랫폼에서 인기 스킬 분석
    const allProfiles = await this.prisma.profile.findMany({
      where: profession ? { profession: profession as any } : undefined,
      select: {
        skills: true,
        techStack: true,
      },
    });

    const skillCount = new Map<string, number>();
    for (const profile of allProfiles) {
      const skills = [...(profile.skills || []), ...(profile.techStack || [])];
      for (const skill of skills) {
        skillCount.set(skill, (skillCount.get(skill) || 0) + 1);
      }
    }

    const totalProfiles = allProfiles.length || 1;

    return Array.from(skillCount.entries())
      .map(([skill, count]) => ({
        skill,
        demandScore: Math.round((count / totalProfiles) * 100),
        trend: 'stable' as const,
        relatedProfessions: [],
      }))
      .sort((a, b) => b.demandScore - a.demandScore)
      .slice(0, 20);
  }
}
