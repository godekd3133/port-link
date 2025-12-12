import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class EndorsementsService {
  constructor(private prisma: PrismaService) {}

  // 스킬 추천하기
  async endorseSkill(
    endorserId: string,
    endorseeId: string,
    skill: string,
    comment?: string,
    relationship?: string,
  ) {
    // 자기 자신 추천 방지
    if (endorserId === endorseeId) {
      throw new ForbiddenException('자기 자신을 추천할 수 없습니다');
    }

    // 대상 사용자 존재 확인
    const endorsee = await this.prisma.user.findUnique({
      where: { id: endorseeId },
      include: { profile: true },
    });

    if (!endorsee) {
      throw new NotFoundException('대상 사용자를 찾을 수 없습니다');
    }

    try {
      return await this.prisma.skillEndorsement.create({
        data: {
          endorserId,
          endorseeId,
          skill,
          comment,
          relationship,
        },
      });
    } catch (error: any) {
      if (error.code === 'P2002') {
        throw new ConflictException('이미 해당 스킬을 추천했습니다');
      }
      throw error;
    }
  }

  // 스킬 추천 취소
  async removeEndorsement(endorserId: string, endorsementId: string) {
    const endorsement = await this.prisma.skillEndorsement.findUnique({
      where: { id: endorsementId },
    });

    if (!endorsement) {
      throw new NotFoundException('추천을 찾을 수 없습니다');
    }

    if (endorsement.endorserId !== endorserId) {
      throw new ForbiddenException('본인의 추천만 취소할 수 있습니다');
    }

    return this.prisma.skillEndorsement.delete({
      where: { id: endorsementId },
    });
  }

  // 특정 사용자가 받은 스킬 추천 목록
  async getEndorsementsForUser(userId: string) {
    const endorsements = await this.prisma.skillEndorsement.findMany({
      where: { endorseeId: userId },
      orderBy: { createdAt: 'desc' },
    });

    // 스킬별로 그룹화
    const skillMap = new Map<
      string,
      { count: number; endorsers: any[]; skill: string }
    >();

    for (const e of endorsements) {
      const endorser = await this.prisma.user.findUnique({
        where: { id: e.endorserId },
        include: { profile: true },
      });

      if (!skillMap.has(e.skill)) {
        skillMap.set(e.skill, { skill: e.skill, count: 0, endorsers: [] });
      }

      const skillData = skillMap.get(e.skill)!;
      skillData.count++;
      skillData.endorsers.push({
        id: e.id,
        endorser: endorser
          ? {
              id: endorser.id,
              name: endorser.profile?.name,
              avatar: endorser.profile?.avatar,
              profession: endorser.profile?.profession,
            }
          : null,
        comment: e.comment,
        relationship: e.relationship,
        createdAt: e.createdAt,
      });
    }

    return Array.from(skillMap.values()).sort((a, b) => b.count - a.count);
  }

  // 내가 한 추천 목록
  async getMyEndorsements(userId: string) {
    return this.prisma.skillEndorsement.findMany({
      where: { endorserId: userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  // 추천서 작성
  async createRecommendation(
    authorId: string,
    data: {
      recipientId: string;
      content: string;
      relationship: string;
      workPeriod?: string;
      projectTitle?: string;
    },
  ) {
    if (authorId === data.recipientId) {
      throw new ForbiddenException('자기 자신에게 추천서를 작성할 수 없습니다');
    }

    const recipient = await this.prisma.user.findUnique({
      where: { id: data.recipientId },
    });

    if (!recipient) {
      throw new NotFoundException('대상 사용자를 찾을 수 없습니다');
    }

    try {
      return this.prisma.profileRecommendation.create({
        data: {
          authorId,
          recipientId: data.recipientId,
          content: data.content,
          relationship: data.relationship,
          workPeriod: data.workPeriod,
          projectTitle: data.projectTitle,
        },
      });
    } catch (error: any) {
      if (error.code === 'P2002') {
        throw new ConflictException('이미 해당 사용자에게 추천서를 작성했습니다');
      }
      throw error;
    }
  }

  // 추천서 수정
  async updateRecommendation(
    authorId: string,
    recommendationId: string,
    data: {
      content?: string;
      relationship?: string;
      workPeriod?: string;
      projectTitle?: string;
    },
  ) {
    const recommendation = await this.prisma.profileRecommendation.findUnique({
      where: { id: recommendationId },
    });

    if (!recommendation) {
      throw new NotFoundException('추천서를 찾을 수 없습니다');
    }

    if (recommendation.authorId !== authorId) {
      throw new ForbiddenException('본인의 추천서만 수정할 수 있습니다');
    }

    return this.prisma.profileRecommendation.update({
      where: { id: recommendationId },
      data: {
        ...data,
        isVerified: false, // 수정 시 검증 상태 초기화
      },
    });
  }

  // 추천서 삭제
  async deleteRecommendation(authorId: string, recommendationId: string) {
    const recommendation = await this.prisma.profileRecommendation.findUnique({
      where: { id: recommendationId },
    });

    if (!recommendation) {
      throw new NotFoundException('추천서를 찾을 수 없습니다');
    }

    if (recommendation.authorId !== authorId) {
      throw new ForbiddenException('본인의 추천서만 삭제할 수 있습니다');
    }

    return this.prisma.profileRecommendation.delete({
      where: { id: recommendationId },
    });
  }

  // 받은 추천서 목록
  async getRecommendationsForUser(userId: string, includePrivate = false) {
    const where: any = { recipientId: userId };
    if (!includePrivate) {
      where.isPublic = true;
    }

    const recommendations = await this.prisma.profileRecommendation.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    // 작성자 정보 조회
    const results = await Promise.all(
      recommendations.map(async (rec) => {
        const author = await this.prisma.user.findUnique({
          where: { id: rec.authorId },
          include: { profile: true },
        });

        return {
          ...rec,
          author: author
            ? {
                id: author.id,
                name: author.profile?.name,
                avatar: author.profile?.avatar,
                profession: author.profile?.profession,
              }
            : null,
        };
      }),
    );

    return results;
  }

  // 추천서 승인 (받은 사람이)
  async verifyRecommendation(recipientId: string, recommendationId: string) {
    const recommendation = await this.prisma.profileRecommendation.findUnique({
      where: { id: recommendationId },
    });

    if (!recommendation) {
      throw new NotFoundException('추천서를 찾을 수 없습니다');
    }

    if (recommendation.recipientId !== recipientId) {
      throw new ForbiddenException('본인에게 온 추천서만 승인할 수 있습니다');
    }

    return this.prisma.profileRecommendation.update({
      where: { id: recommendationId },
      data: { isVerified: true },
    });
  }

  // 추천서 공개/비공개 설정
  async setRecommendationVisibility(
    recipientId: string,
    recommendationId: string,
    isPublic: boolean,
  ) {
    const recommendation = await this.prisma.profileRecommendation.findUnique({
      where: { id: recommendationId },
    });

    if (!recommendation) {
      throw new NotFoundException('추천서를 찾을 수 없습니다');
    }

    if (recommendation.recipientId !== recipientId) {
      throw new ForbiddenException('본인에게 온 추천서만 설정할 수 있습니다');
    }

    return this.prisma.profileRecommendation.update({
      where: { id: recommendationId },
      data: { isPublic },
    });
  }
}
