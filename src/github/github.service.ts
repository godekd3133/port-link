import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../database/prisma.service';

export interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  homepage: string | null;
  language: string | null;
  languages_url: string;
  stargazers_count: number;
  forks_count: number;
  topics: string[];
  created_at: string;
  updated_at: string;
  pushed_at: string;
}

export interface ImportableProject {
  repo: GitHubRepo;
  languages: Record<string, number>;
  suggestedCategory: string;
  suggestedSkills: string[];
}

@Injectable()
export class GitHubService {
  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {}

  // GitHub OAuth URL 생성
  getOAuthUrl(userId: string): string {
    const clientId = this.configService.get('GITHUB_CLIENT_ID');
    const redirectUri = this.configService.get('GITHUB_REDIRECT_URI');
    const scope = 'read:user,repo';
    const state = Buffer.from(JSON.stringify({ userId })).toString('base64');

    return `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scope}&state=${state}`;
  }

  // OAuth 콜백 처리
  async handleOAuthCallback(code: string, state: string) {
    const clientId = this.configService.get('GITHUB_CLIENT_ID');
    const clientSecret = this.configService.get('GITHUB_CLIENT_SECRET');

    // state에서 userId 추출
    let userId: string;
    try {
      const decoded = JSON.parse(Buffer.from(state, 'base64').toString());
      userId = decoded.userId;
    } catch {
      throw new BadRequestException('Invalid state parameter');
    }

    // Access token 교환
    const tokenResponse = await fetch(
      'https://github.com/login/oauth/access_token',
      {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          client_id: clientId,
          client_secret: clientSecret,
          code,
        }),
      },
    );

    const tokenData = await tokenResponse.json();

    if (tokenData.error) {
      throw new BadRequestException(tokenData.error_description || 'OAuth failed');
    }

    // GitHub 사용자 정보 조회
    const userResponse = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    });

    const githubUser = await userResponse.json();

    // 연동 정보 저장
    await this.prisma.gitHubIntegration.upsert({
      where: { userId },
      update: {
        githubUsername: githubUser.login,
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        lastSyncAt: new Date(),
      },
      create: {
        userId,
        githubUsername: githubUser.login,
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        lastSyncAt: new Date(),
      },
    });

    return {
      success: true,
      githubUsername: githubUser.login,
    };
  }

  // GitHub 연동 상태 확인
  async getIntegrationStatus(userId: string) {
    const integration = await this.prisma.gitHubIntegration.findUnique({
      where: { userId },
    });

    if (!integration) {
      return { connected: false };
    }

    return {
      connected: true,
      githubUsername: integration.githubUsername,
      lastSyncAt: integration.lastSyncAt,
      autoSync: integration.autoSync,
    };
  }

  // 연동 해제
  async disconnect(userId: string) {
    await this.prisma.gitHubIntegration.delete({
      where: { userId },
    }).catch(() => {
      // 이미 없으면 무시
    });

    return { success: true };
  }

  // 사용자 레포지토리 목록 조회
  async listRepositories(userId: string): Promise<ImportableProject[]> {
    const integration = await this.prisma.gitHubIntegration.findUnique({
      where: { userId },
    });

    if (!integration?.accessToken) {
      throw new NotFoundException('GitHub 연동이 필요합니다');
    }

    const response = await fetch(
      'https://api.github.com/user/repos?sort=updated&per_page=50',
      {
        headers: {
          Authorization: `Bearer ${integration.accessToken}`,
        },
      },
    );

    if (!response.ok) {
      throw new BadRequestException('GitHub API 오류');
    }

    const repos: GitHubRepo[] = await response.json();

    // 각 레포에 대해 추가 정보 수집
    const importableProjects = await Promise.all(
      repos
        .filter((repo) => !repo.full_name.includes('.github'))
        .slice(0, 20)
        .map(async (repo) => {
          // 언어 정보 조회
          let languages: Record<string, number> = {};
          try {
            const langResponse = await fetch(repo.languages_url, {
              headers: {
                Authorization: `Bearer ${integration.accessToken}`,
              },
            });
            languages = await langResponse.json();
          } catch {
            // 언어 정보 조회 실패 시 무시
          }

          // 카테고리 및 스킬 추천
          const { category, skills } = this.suggestCategoryAndSkills(
            repo,
            languages,
          );

          return {
            repo,
            languages,
            suggestedCategory: category,
            suggestedSkills: skills,
          };
        }),
    );

    return importableProjects;
  }

  // 레포지토리를 포스트로 가져오기
  async importRepository(
    userId: string,
    repoFullName: string,
    customData?: {
      title?: string;
      summary?: string;
      content?: string;
      category?: string;
      skills?: string[];
    },
  ) {
    const integration = await this.prisma.gitHubIntegration.findUnique({
      where: { userId },
    });

    if (!integration?.accessToken) {
      throw new NotFoundException('GitHub 연동이 필요합니다');
    }

    // 레포지토리 정보 조회
    const repoResponse = await fetch(
      `https://api.github.com/repos/${repoFullName}`,
      {
        headers: {
          Authorization: `Bearer ${integration.accessToken}`,
        },
      },
    );

    if (!repoResponse.ok) {
      throw new NotFoundException('레포지토리를 찾을 수 없습니다');
    }

    const repo: GitHubRepo = await repoResponse.json();

    // README 조회
    let readme = '';
    try {
      const readmeResponse = await fetch(
        `https://api.github.com/repos/${repoFullName}/readme`,
        {
          headers: {
            Authorization: `Bearer ${integration.accessToken}`,
            Accept: 'application/vnd.github.raw',
          },
        },
      );
      if (readmeResponse.ok) {
        readme = await readmeResponse.text();
      }
    } catch {
      // README 없으면 무시
    }

    // 언어 정보 조회
    let languages: Record<string, number> = {};
    try {
      const langResponse = await fetch(repo.languages_url, {
        headers: {
          Authorization: `Bearer ${integration.accessToken}`,
        },
      });
      languages = await langResponse.json();
    } catch {
      // 언어 정보 조회 실패 시 무시
    }

    // 카테고리 및 스킬 추천
    const { category, skills } = this.suggestCategoryAndSkills(repo, languages);

    // 포스트 생성
    const post = await this.prisma.post.create({
      data: {
        authorId: userId,
        title: customData?.title || repo.name,
        summary: customData?.summary || repo.description || undefined,
        content:
          customData?.content ||
          this.generateContentFromReadme(readme, repo),
        category: (customData?.category || category) as any,
        skills: customData?.skills || skills,
        techStack: Object.keys(languages),
        repositoryUrl: repo.html_url,
        demoUrl: repo.homepage || undefined,
        status: 'DRAFT',
        projectStartDate: new Date(repo.created_at),
      },
      include: {
        author: {
          include: { profile: true },
        },
      },
    });

    // 마지막 동기화 시간 업데이트
    await this.prisma.gitHubIntegration.update({
      where: { userId },
      data: { lastSyncAt: new Date() },
    });

    return post;
  }

  // 카테고리 및 스킬 추천 로직
  private suggestCategoryAndSkills(
    repo: GitHubRepo,
    languages: Record<string, number>,
  ): { category: string; skills: string[] } {
    const langKeys = Object.keys(languages);
    const topics = repo.topics || [];
    const allKeywords = [
      ...langKeys.map((l) => l.toLowerCase()),
      ...topics.map((t) => t.toLowerCase()),
      (repo.description || '').toLowerCase(),
    ].join(' ');

    let category = 'OTHER';
    const skills: string[] = [...langKeys];

    // 웹 앱 판단
    if (
      allKeywords.includes('react') ||
      allKeywords.includes('vue') ||
      allKeywords.includes('angular') ||
      allKeywords.includes('nextjs') ||
      allKeywords.includes('web')
    ) {
      category = 'WEB_APP';
      if (allKeywords.includes('react')) skills.push('React');
      if (allKeywords.includes('vue')) skills.push('Vue.js');
      if (allKeywords.includes('nextjs')) skills.push('Next.js');
      if (allKeywords.includes('tailwind')) skills.push('Tailwind CSS');
    }

    // 모바일 앱 판단
    if (
      allKeywords.includes('ios') ||
      allKeywords.includes('android') ||
      allKeywords.includes('flutter') ||
      allKeywords.includes('react-native') ||
      allKeywords.includes('swift') ||
      allKeywords.includes('kotlin')
    ) {
      category = 'MOBILE_APP';
      if (allKeywords.includes('flutter')) skills.push('Flutter');
      if (allKeywords.includes('react-native')) skills.push('React Native');
    }

    // 게임 판단
    if (
      allKeywords.includes('game') ||
      allKeywords.includes('unity') ||
      allKeywords.includes('unreal') ||
      allKeywords.includes('godot')
    ) {
      category = 'GAME';
      if (allKeywords.includes('unity')) skills.push('Unity');
      if (allKeywords.includes('unreal')) skills.push('Unreal Engine');
    }

    // 데이터 분석 판단
    if (
      allKeywords.includes('data') ||
      allKeywords.includes('analysis') ||
      allKeywords.includes('machine-learning') ||
      allKeywords.includes('ml') ||
      allKeywords.includes('ai')
    ) {
      category = 'DATA_ANALYSIS';
      if (allKeywords.includes('python')) skills.push('Python');
      if (allKeywords.includes('pandas')) skills.push('Pandas');
      if (allKeywords.includes('tensorflow')) skills.push('TensorFlow');
    }

    // 중복 제거
    const uniqueSkills = [...new Set(skills)].slice(0, 10);

    return { category, skills: uniqueSkills };
  }

  // README로부터 콘텐츠 생성
  private generateContentFromReadme(readme: string, repo: GitHubRepo): string {
    if (readme) {
      return readme;
    }

    // README가 없으면 기본 템플릿 생성
    return `# ${repo.name}

${repo.description || '프로젝트 설명이 없습니다.'}

## 프로젝트 정보

- **GitHub**: [${repo.full_name}](${repo.html_url})
${repo.homepage ? `- **데모**: [${repo.homepage}](${repo.homepage})` : ''}
- **Stars**: ${repo.stargazers_count}
- **Forks**: ${repo.forks_count}

## 사용 기술

${repo.topics?.length ? repo.topics.map((t) => `- ${t}`).join('\n') : '(기술 태그 없음)'}
`;
  }

  // 자동 동기화 설정
  async setAutoSync(userId: string, enabled: boolean, settings?: any) {
    return this.prisma.gitHubIntegration.update({
      where: { userId },
      data: {
        autoSync: enabled,
        syncSettings: settings,
      },
    });
  }
}
