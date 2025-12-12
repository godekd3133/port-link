import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

export interface MatchScore {
  userId: string;
  profile: any;
  score: number;
  matchReasons: string[];
  commonSkills: string[];
  complementarySkills: string[];
}

@Injectable()
export class MatchingService {
  constructor(private prisma: PrismaService) {}

  // 스킬 기반 협업자 추천
  async findMatchingCollaborators(
    userId: string,
    options: {
      targetProfession?: string;
      requiredSkills?: string[];
      limit?: number;
    } = {},
  ): Promise<MatchScore[]> {
    const { targetProfession, requiredSkills = [], limit = 10 } = options;

    // 현재 사용자 프로필 조회
    const currentUser = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true },
    });

    if (!currentUser?.profile) {
      return [];
    }

    const mySkills = [
      ...(currentUser.profile.skills || []),
      ...(currentUser.profile.techStack || []),
    ];
    const myProfession = currentUser.profile.profession;

    // 협업 가능한 사용자들 조회
    const where: any = {
      userId: { not: userId },
      isOpenToCollaborate: true,
    };

    if (targetProfession) {
      where.profession = targetProfession;
    }

    const candidates = await this.prisma.profile.findMany({
      where,
      include: {
        user: true,
        contributions: {
          include: { post: true },
        },
      },
    });

    // 각 후보자에 대해 매칭 점수 계산
    const scoredCandidates: MatchScore[] = candidates.map((candidate) => {
      const candidateSkills = [
        ...(candidate.skills || []),
        ...(candidate.techStack || []),
      ];

      // 공통 스킬 찾기
      const commonSkills = mySkills.filter((skill) =>
        candidateSkills.some(
          (cs) => cs.toLowerCase() === skill.toLowerCase(),
        ),
      );

      // 보완 스킬 찾기 (내가 없고 상대가 있는)
      const complementarySkills = candidateSkills.filter(
        (skill) =>
          !mySkills.some((ms) => ms.toLowerCase() === skill.toLowerCase()),
      );

      // 필수 스킬 매칭
      const requiredSkillsMatched = requiredSkills.filter((skill) =>
        candidateSkills.some(
          (cs) => cs.toLowerCase() === skill.toLowerCase(),
        ),
      );

      // 점수 계산
      let score = 0;
      const matchReasons: string[] = [];

      // 1. 필수 스킬 매칭 (각 40점)
      score += requiredSkillsMatched.length * 40;
      if (requiredSkillsMatched.length > 0) {
        matchReasons.push(
          `필수 스킬 보유: ${requiredSkillsMatched.join(', ')}`,
        );
      }

      // 2. 보완 스킬 (각 15점, 최대 60점)
      const complementaryScore = Math.min(complementarySkills.length * 15, 60);
      score += complementaryScore;
      if (complementarySkills.length > 0) {
        matchReasons.push(
          `보완 가능한 스킬: ${complementarySkills.slice(0, 5).join(', ')}`,
        );
      }

      // 3. 협업 이력 (20점)
      if (candidate.contributions.length > 0) {
        score += 20;
        matchReasons.push(
          `${candidate.contributions.length}개 프로젝트 협업 경험`,
        );
      }

      // 4. 프로필 완성도 보너스 (최대 20점)
      let profileCompleteness = 0;
      if (candidate.bio) profileCompleteness += 5;
      if (candidate.skills.length >= 3) profileCompleteness += 5;
      if (candidate.avatar) profileCompleteness += 5;
      if (candidate.yearsOfExperience) profileCompleteness += 5;
      score += profileCompleteness;

      // 5. 같은 직종이면 감점 (다양성 위해) - 단, targetProfession 지정 시 제외
      if (!targetProfession && candidate.profession === myProfession) {
        score -= 10;
      }

      // 6. 구직 중인 경우 보너스
      if (candidate.isOpenToWork) {
        score += 10;
        matchReasons.push('적극적인 협업 의향');
      }

      return {
        userId: candidate.userId,
        profile: {
          id: candidate.id,
          userId: candidate.userId,
          name: candidate.name,
          username: candidate.username,
          avatar: candidate.avatar,
          bio: candidate.bio,
          profession: candidate.profession,
          skills: candidate.skills,
          techStack: candidate.techStack,
          yearsOfExperience: candidate.yearsOfExperience,
          isOpenToWork: candidate.isOpenToWork,
          isOpenToCollaborate: candidate.isOpenToCollaborate,
        },
        score: Math.max(0, score),
        matchReasons,
        commonSkills,
        complementarySkills: complementarySkills.slice(0, 10),
      };
    });

    // 점수순 정렬 및 상위 N개 반환
    return scoredCandidates
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  // 프로젝트에 맞는 팀원 추천
  async recommendTeamForProject(
    userId: string,
    projectData: {
      category: string;
      skills: string[];
      description?: string;
    },
  ) {
    const { category, skills } = projectData;

    // 카테고리별 추천 직종 매핑
    const categoryToProfessions: Record<string, string[]> = {
      WEB_APP: ['DEVELOPER', 'DESIGNER', 'PM'],
      MOBILE_APP: ['DEVELOPER', 'DESIGNER', 'PM'],
      DESIGN: ['DESIGNER', 'PHOTOGRAPHER', 'VIDEO_CREATOR'],
      BRANDING: ['DESIGNER', 'MARKETER', 'WRITER'],
      MARKETING: ['MARKETER', 'CONTENT_CREATOR', 'DATA_ANALYST'],
      VIDEO: ['VIDEO_CREATOR', 'MUSICIAN', 'PHOTOGRAPHER'],
      PHOTOGRAPHY: ['PHOTOGRAPHER', 'DESIGNER'],
      MUSIC: ['MUSICIAN', 'VIDEO_CREATOR'],
      WRITING: ['WRITER', 'CONTENT_CREATOR', 'RESEARCHER'],
      RESEARCH: ['RESEARCHER', 'DATA_ANALYST', 'CONSULTANT'],
      DATA_ANALYSIS: ['DATA_ANALYST', 'DEVELOPER', 'RESEARCHER'],
      CASE_STUDY: ['CONSULTANT', 'RESEARCHER', 'WRITER'],
      GAME: ['DEVELOPER', 'DESIGNER', 'MUSICIAN'],
      HARDWARE: ['DEVELOPER', 'RESEARCHER'],
      OTHER: [],
    };

    const recommendedProfessions = categoryToProfessions[category] || [];

    // 각 직종별로 최적 후보자 찾기
    const teamRecommendations = await Promise.all(
      recommendedProfessions.map(async (profession) => {
        const matches = await this.findMatchingCollaborators(userId, {
          targetProfession: profession,
          requiredSkills: skills,
          limit: 3,
        });

        return {
          profession,
          candidates: matches,
        };
      }),
    );

    // 최고 점수 후보자로 드림팀 구성
    const dreamTeam = teamRecommendations
      .map((rec) => ({
        profession: rec.profession,
        topCandidate: rec.candidates[0] || null,
      }))
      .filter((item) => item.topCandidate !== null);

    return {
      teamRecommendations,
      dreamTeam,
      projectCategory: category,
      requiredSkills: skills,
    };
  }

  // 비슷한 프로필 찾기 (네트워킹용)
  async findSimilarProfiles(userId: string, limit = 10) {
    const currentUser = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true },
    });

    if (!currentUser?.profile) {
      return [];
    }

    const mySkills = [
      ...(currentUser.profile.skills || []),
      ...(currentUser.profile.techStack || []),
    ];

    const candidates = await this.prisma.profile.findMany({
      where: {
        userId: { not: userId },
        profession: currentUser.profile.profession,
      },
    });

    const scored = candidates.map((candidate) => {
      const candidateSkills = [
        ...(candidate.skills || []),
        ...(candidate.techStack || []),
      ];

      const commonSkills = mySkills.filter((skill) =>
        candidateSkills.some(
          (cs) => cs.toLowerCase() === skill.toLowerCase(),
        ),
      );

      const similarity =
        mySkills.length > 0
          ? (commonSkills.length / mySkills.length) * 100
          : 0;

      return {
        profile: candidate,
        similarity: Math.round(similarity),
        commonSkills,
      };
    });

    return scored
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);
  }

  // 스킬 기반 추천 (배울 수 있는 사람)
  async findMentors(userId: string, targetSkill: string, limit = 5) {
    const candidates = await this.prisma.profile.findMany({
      where: {
        userId: { not: userId },
        OR: [
          { skills: { has: targetSkill } },
          { techStack: { has: targetSkill } },
        ],
      },
      include: {
        user: {
          include: {
            posts: {
              where: { status: 'PUBLISHED' },
              take: 5,
            },
          },
        },
        contributions: true,
      },
    });

    const scored = candidates.map((candidate) => {
      let expertiseScore = 0;

      // 포스트 수로 활동성 평가
      expertiseScore += (candidate.user.posts?.length || 0) * 10;

      // 협업 경험
      expertiseScore += (candidate.contributions?.length || 0) * 15;

      // 경력 연수
      expertiseScore += (candidate.yearsOfExperience || 0) * 5;

      return {
        profile: {
          id: candidate.id,
          userId: candidate.userId,
          name: candidate.name,
          avatar: candidate.avatar,
          profession: candidate.profession,
          yearsOfExperience: candidate.yearsOfExperience,
        },
        expertiseScore,
        postsCount: candidate.user.posts?.length || 0,
        collaborationsCount: candidate.contributions?.length || 0,
      };
    });

    return scored
      .sort((a, b) => b.expertiseScore - a.expertiseScore)
      .slice(0, limit);
  }
}
