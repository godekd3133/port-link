import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../database/prisma.service';
import OpenAI from 'openai';
import { Profession, ProfessionLabels } from '../common/enums';

export interface ProfileCompletenessResult {
  score: number;
  breakdown: {
    basicInfo: { score: number; max: number; missing: string[] };
    professional: { score: number; max: number; missing: string[] };
    portfolio: { score: number; max: number; missing: string[] };
    social: { score: number; max: number; missing: string[] };
  };
  suggestions: string[];
  level: 'beginner' | 'intermediate' | 'advanced' | 'expert';
}

export interface AiProfileSuggestion {
  category: string;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  actionable: string;
}

export interface ProfileAnalysisResult {
  completeness: ProfileCompletenessResult;
  aiSuggestions: AiProfileSuggestion[];
  marketComparison: {
    skillsInDemand: string[];
    skillGaps: string[];
    trendingSkills: string[];
  };
  careerTips: string[];
}

export interface ResumeExportData {
  name: string;
  profession: string;
  bio: string;
  skills: string[];
  experience: string;
  projects: {
    title: string;
    summary: string;
    skills: string[];
    links: string[];
  }[];
  socialLinks: Record<string, string>;
  contact: {
    email: string;
    github?: string;
    website?: string;
  };
}

@Injectable()
export class PortfolioCoachService {
  private readonly logger = new Logger(PortfolioCoachService.name);
  private openai: OpenAI | null = null;
  private readonly model: string;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    this.model = this.configService.get<string>('OPENAI_MODEL') || 'gpt-4o-mini';

    if (apiKey) {
      this.openai = new OpenAI({ apiKey });
    }
  }

  async getProfileCompleteness(userId: string): Promise<ProfileCompletenessResult> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: true,
      },
    });

    if (!user || !user.profile) {
      throw new BadRequestException('프로필을 찾을 수 없습니다.');
    }

    const profile = user.profile;

    // Basic Info (25점)
    const basicInfo = {
      score: 0,
      max: 25,
      missing: [] as string[],
    };
    if (profile.name) basicInfo.score += 8;
    else basicInfo.missing.push('이름');
    if (profile.username) basicInfo.score += 5;
    else basicInfo.missing.push('사용자명');
    if (profile.bio && profile.bio.length >= 50) basicInfo.score += 7;
    else basicInfo.missing.push('자기소개 (50자 이상)');
    if (profile.avatar) basicInfo.score += 5;
    else basicInfo.missing.push('프로필 사진');

    // Professional (30점)
    const professional = {
      score: 0,
      max: 30,
      missing: [] as string[],
    };
    if (profile.profession) professional.score += 10;
    else professional.missing.push('직종');
    if (profile.skills && profile.skills.length >= 3) professional.score += 10;
    else professional.missing.push('스킬 (3개 이상)');
    if (profile.yearsOfExperience) professional.score += 5;
    else professional.missing.push('경력 연수');
    if (profile.secondaryProfession) professional.score += 5;
    else professional.missing.push('부 직종');

    // Portfolio (30점)
    const postCount = await this.prisma.post.count({
      where: { authorId: userId, status: 'PUBLISHED' },
    });
    const portfolio = {
      score: 0,
      max: 30,
      missing: [] as string[],
    };
    if (postCount >= 1) portfolio.score += 10;
    else portfolio.missing.push('프로젝트 1개 이상');
    if (postCount >= 3) portfolio.score += 10;
    else if (postCount < 3) portfolio.missing.push('프로젝트 3개 이상');
    if (postCount >= 5) portfolio.score += 10;
    else if (postCount < 5) portfolio.missing.push('프로젝트 5개 이상');

    // Social (15점)
    const social = {
      score: 0,
      max: 15,
      missing: [] as string[],
    };
    const socialLinks = [
      { field: profile.githubUrl, name: 'GitHub' },
      { field: profile.linkedinUrl, name: 'LinkedIn' },
      { field: profile.websiteUrl, name: '개인 웹사이트' },
      { field: profile.behanceUrl, name: 'Behance' },
      { field: profile.dribbbleUrl, name: 'Dribbble' },
      { field: profile.instagramUrl, name: 'Instagram' },
      { field: profile.youtubeUrl, name: 'YouTube' },
      { field: profile.twitterUrl, name: 'Twitter' },
    ];

    const filledSocial = socialLinks.filter((l) => l.field).length;
    if (filledSocial >= 1) social.score += 5;
    else social.missing.push('소셜 링크 1개 이상');
    if (filledSocial >= 2) social.score += 5;
    else if (filledSocial < 2) social.missing.push('소셜 링크 2개 이상');
    if (filledSocial >= 3) social.score += 5;
    else if (filledSocial < 3) social.missing.push('소셜 링크 3개 이상');

    const totalScore = basicInfo.score + professional.score + portfolio.score + social.score;

    // Generate suggestions
    const suggestions: string[] = [];
    if (basicInfo.missing.length > 0) {
      suggestions.push(`기본 정보를 완성하세요: ${basicInfo.missing.join(', ')}`);
    }
    if (professional.missing.length > 0) {
      suggestions.push(`전문성을 강화하세요: ${professional.missing.join(', ')}`);
    }
    if (portfolio.missing.length > 0) {
      suggestions.push(`포트폴리오를 채우세요: ${portfolio.missing.join(', ')}`);
    }
    if (social.missing.length > 0) {
      suggestions.push(`네트워크를 확장하세요: ${social.missing.join(', ')}`);
    }

    // Determine level
    let level: 'beginner' | 'intermediate' | 'advanced' | 'expert' = 'beginner';
    if (totalScore >= 80) level = 'expert';
    else if (totalScore >= 60) level = 'advanced';
    else if (totalScore >= 40) level = 'intermediate';

    return {
      score: totalScore,
      breakdown: {
        basicInfo,
        professional,
        portfolio,
        social,
      },
      suggestions,
      level,
    };
  }

  async analyzeProfile(userId: string): Promise<ProfileAnalysisResult> {
    const completeness = await this.getProfileCompleteness(userId);

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: true,
        posts: {
          where: { status: 'PUBLISHED' },
          take: 10,
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!user || !user.profile) {
      throw new BadRequestException('프로필을 찾을 수 없습니다.');
    }

    let aiSuggestions: AiProfileSuggestion[] = [];
    let marketComparison = {
      skillsInDemand: [] as string[],
      skillGaps: [] as string[],
      trendingSkills: [] as string[],
    };
    let careerTips: string[] = [];

    // AI suggestions if OpenAI is available
    if (this.openai) {
      const aiResult = await this.getAiSuggestions(user.profile, user.posts);
      aiSuggestions = aiResult.suggestions;
      marketComparison = aiResult.marketComparison;
      careerTips = aiResult.careerTips;
    } else {
      // Fallback suggestions without AI
      aiSuggestions = this.getStaticSuggestions(user.profile, completeness);
      marketComparison = this.getStaticMarketComparison(user.profile.profession as Profession);
      careerTips = this.getStaticCareerTips(user.profile.profession as Profession);
    }

    return {
      completeness,
      aiSuggestions,
      marketComparison,
      careerTips,
    };
  }

  private async getAiSuggestions(
    profile: any,
    posts: any[],
  ): Promise<{
    suggestions: AiProfileSuggestion[];
    marketComparison: { skillsInDemand: string[]; skillGaps: string[]; trendingSkills: string[] };
    careerTips: string[];
  }> {
    const professionLabel = profile.profession
      ? ProfessionLabels[profile.profession as Profession]
      : '전문가';

    const prompt = `당신은 ${professionLabel} 커리어 코치입니다. 다음 프로필을 분석하고 개선 제안을 해주세요.

프로필 정보:
- 이름: ${profile.name || '미설정'}
- 직종: ${professionLabel}
- 자기소개: ${profile.bio || '미설정'}
- 스킬: ${profile.skills?.join(', ') || '미설정'}
- 경력: ${profile.yearsOfExperience || 0}년
- 프로젝트 수: ${posts.length}개

최근 프로젝트:
${posts
  .slice(0, 3)
  .map((p) => `- ${p.title}: ${p.summary || p.content?.substring(0, 100)}`)
  .join('\n')}

다음 JSON 형식으로 응답해주세요:
{
  "suggestions": [
    {
      "category": "프로필" | "스킬" | "포트폴리오" | "네트워킹",
      "title": "제안 제목",
      "description": "상세 설명",
      "priority": "high" | "medium" | "low",
      "actionable": "구체적인 행동 제안"
    }
  ],
  "marketComparison": {
    "skillsInDemand": ["현재 보유한 수요 높은 스킬"],
    "skillGaps": ["추가로 필요한 스킬"],
    "trendingSkills": ["${professionLabel} 분야 트렌딩 스킬"]
  },
  "careerTips": ["커리어 조언 1", "커리어 조언 2"]
}

반드시 유효한 JSON만 반환하세요.`;

    try {
      const response = await this.openai!.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: `당신은 ${professionLabel} 분야 전문 커리어 코치입니다. 실용적이고 구체적인 조언을 제공합니다.`,
          },
          { role: 'user', content: prompt },
        ],
        temperature: 0.7,
        max_tokens: 1500,
        response_format: { type: 'json_object' },
      });

      const content = response.choices[0]?.message?.content || '{}';
      return JSON.parse(content);
    } catch (error) {
      this.logger.error('AI suggestion error:', error);
      return {
        suggestions: [],
        marketComparison: { skillsInDemand: [], skillGaps: [], trendingSkills: [] },
        careerTips: [],
      };
    }
  }

  private getStaticSuggestions(
    profile: any,
    completeness: ProfileCompletenessResult,
  ): AiProfileSuggestion[] {
    const suggestions: AiProfileSuggestion[] = [];

    if (completeness.breakdown.basicInfo.score < completeness.breakdown.basicInfo.max) {
      suggestions.push({
        category: '프로필',
        title: '기본 정보 완성하기',
        description: '기본 정보가 완성되지 않았습니다. 프로필 사진과 자기소개를 추가하세요.',
        priority: 'high',
        actionable: '프로필 설정 페이지에서 누락된 정보를 입력하세요.',
      });
    }

    if (!profile.skills || profile.skills.length < 5) {
      suggestions.push({
        category: '스킬',
        title: '스킬 더 추가하기',
        description: '보유한 스킬을 더 상세하게 나열하면 검색 노출이 높아집니다.',
        priority: 'medium',
        actionable: '최소 5개 이상의 스킬을 추가하세요.',
      });
    }

    if (completeness.breakdown.portfolio.score < 20) {
      suggestions.push({
        category: '포트폴리오',
        title: '프로젝트 추가하기',
        description: '포트폴리오에 프로젝트가 부족합니다. 더 많은 작업물을 공유하세요.',
        priority: 'high',
        actionable: '최소 3개 이상의 프로젝트를 게시하세요.',
      });
    }

    if (completeness.breakdown.social.score < 10) {
      suggestions.push({
        category: '네트워킹',
        title: '소셜 링크 연결하기',
        description: '소셜 미디어 프로필을 연결하면 신뢰도가 높아집니다.',
        priority: 'low',
        actionable: 'GitHub, LinkedIn 등 전문 네트워크를 연결하세요.',
      });
    }

    return suggestions;
  }

  private getStaticMarketComparison(profession?: Profession): {
    skillsInDemand: string[];
    skillGaps: string[];
    trendingSkills: string[];
  } {
    const trendsByProfession: Record<
      string,
      { inDemand: string[]; trending: string[] }
    > = {
      DEVELOPER: {
        inDemand: ['TypeScript', 'React', 'Node.js', 'AWS', 'Docker'],
        trending: ['AI/ML', 'Rust', 'WebAssembly', 'Edge Computing'],
      },
      DESIGNER: {
        inDemand: ['Figma', 'UI/UX', 'Design System', 'Prototyping'],
        trending: ['AI Design Tools', '3D Design', 'Motion Design', 'AR/VR'],
      },
      PM: {
        inDemand: ['Agile', 'Data Analysis', 'Stakeholder Management', 'Roadmapping'],
        trending: ['AI Product', 'Growth Hacking', 'PLG', 'No-Code Tools'],
      },
      MARKETER: {
        inDemand: ['SEO', 'Performance Marketing', 'Analytics', 'Content Strategy'],
        trending: ['AI Marketing', 'Influencer Marketing', 'Community Building'],
      },
      DATA_ANALYST: {
        inDemand: ['SQL', 'Python', 'Tableau', 'Statistical Analysis'],
        trending: ['Machine Learning', 'Real-time Analytics', 'Data Engineering'],
      },
      DEFAULT: {
        inDemand: ['Communication', 'Project Management', 'Problem Solving'],
        trending: ['AI Tools', 'Remote Collaboration', 'Digital Skills'],
      },
    };

    const professionKey = profession || 'DEFAULT';
    const trends = trendsByProfession[professionKey] || trendsByProfession['DEFAULT'];

    return {
      skillsInDemand: trends.inDemand,
      skillGaps: [],
      trendingSkills: trends.trending,
    };
  }

  private getStaticCareerTips(profession?: Profession): string[] {
    const tips: Record<string, string[]> = {
      DEVELOPER: [
        '오픈소스 프로젝트에 기여하면 네트워크와 실력을 동시에 쌓을 수 있습니다.',
        '기술 블로그를 운영하면 전문성을 어필할 수 있습니다.',
        '사이드 프로젝트로 새로운 기술을 실험해보세요.',
      ],
      DESIGNER: [
        'Dribbble, Behance에 정기적으로 작업물을 올리세요.',
        '디자인 과정(Process)을 상세히 문서화하세요.',
        '다른 디자이너와 협업 프로젝트를 진행해보세요.',
      ],
      PM: [
        '프로덕트 성과를 수치로 기록하세요.',
        '실패한 프로젝트에서도 배운 점을 정리하세요.',
        '산업 트렌드와 경쟁사 분석을 꾸준히 하세요.',
      ],
      DEFAULT: [
        '전문 분야의 커뮤니티에 적극 참여하세요.',
        '꾸준히 포트폴리오를 업데이트하세요.',
        '피드백을 구하고 개선점을 찾으세요.',
      ],
    };

    return tips[profession || 'DEFAULT'] || tips['DEFAULT'];
  }

  async exportResume(userId: string): Promise<ResumeExportData> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: true,
        posts: {
          where: { status: 'PUBLISHED' },
          take: 10,
          orderBy: { createdAt: 'desc' },
          select: {
            title: true,
            summary: true,
            skills: true,
            techStack: true,
            repositoryUrl: true,
            demoUrl: true,
            behanceUrl: true,
            figmaUrl: true,
          },
        },
      },
    });

    if (!user || !user.profile) {
      throw new BadRequestException('프로필을 찾을 수 없습니다.');
    }

    const profile = user.profile;

    return {
      name: profile.name || '',
      profession: profile.profession
        ? ProfessionLabels[profile.profession as Profession]
        : '',
      bio: profile.bio || '',
      skills: profile.skills || [],
      experience: profile.yearsOfExperience
        ? `${profile.yearsOfExperience}년`
        : '',
      projects: user.posts.map((post) => ({
        title: post.title,
        summary: post.summary || '',
        skills: [...(post.skills || []), ...(post.techStack || [])],
        links: [post.repositoryUrl, post.demoUrl, post.behanceUrl, post.figmaUrl].filter(
          Boolean,
        ) as string[],
      })),
      socialLinks: {
        ...(profile.githubUrl && { github: profile.githubUrl }),
        ...(profile.linkedinUrl && { linkedin: profile.linkedinUrl }),
        ...(profile.websiteUrl && { website: profile.websiteUrl }),
        ...(profile.behanceUrl && { behance: profile.behanceUrl }),
        ...(profile.dribbbleUrl && { dribbble: profile.dribbbleUrl }),
        ...(profile.twitterUrl && { twitter: profile.twitterUrl }),
      },
      contact: {
        email: user.email,
        github: profile.githubUrl || undefined,
        website: profile.websiteUrl || undefined,
      },
    };
  }
}
