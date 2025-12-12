import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import {
  CreateCollaborationRequestDto,
  UpdateCollaborationStatusDto,
} from './dto/create-collaboration.dto';
import { CollaborationStatus } from '../common/enums';

@Injectable()
export class CollaborationsService {
  constructor(private prisma: PrismaService) {}

  // 협업 요청 생성
  async create(senderId: string, dto: CreateCollaborationRequestDto) {
    // 자기 자신에게 요청 불가
    if (senderId === dto.receiverId) {
      throw new BadRequestException('자기 자신에게 협업 요청을 보낼 수 없습니다.');
    }

    // 받는 사람 존재 확인
    const receiver = await this.prisma.user.findUnique({
      where: { id: dto.receiverId },
      include: { profile: true },
    });

    if (!receiver) {
      throw new NotFoundException('받는 사람을 찾을 수 없습니다.');
    }

    // 협업 제안 받기 설정 확인
    if (receiver.profile && !receiver.profile.isOpenToCollaborate) {
      throw new BadRequestException('이 사용자는 현재 협업 제안을 받지 않고 있습니다.');
    }

    // 이미 대기중인 요청이 있는지 확인
    const existingRequest = await this.prisma.collaborationRequest.findFirst({
      where: {
        senderId,
        receiverId: dto.receiverId,
        status: 'PENDING',
      },
    });

    if (existingRequest) {
      throw new BadRequestException('이미 대기중인 협업 요청이 있습니다.');
    }

    // 프로젝트 존재 확인 (postId가 있는 경우)
    if (dto.postId) {
      const post = await this.prisma.post.findUnique({
        where: { id: dto.postId },
      });

      if (!post) {
        throw new NotFoundException('프로젝트를 찾을 수 없습니다.');
      }
    }

    // 협업 요청 생성
    const request = await this.prisma.collaborationRequest.create({
      data: {
        senderId,
        receiverId: dto.receiverId,
        postId: dto.postId,
        title: dto.title,
        message: dto.message,
        proposedRole: dto.proposedRole,
        status: 'PENDING',
      },
    });

    // 알림 생성
    await this.prisma.notification.create({
      data: {
        userId: dto.receiverId,
        type: 'collaboration_request',
        title: '새로운 협업 요청',
        message: `${dto.title}`,
        relatedUserId: senderId,
      },
    });

    return request;
  }

  // 받은 협업 요청 목록
  async getReceivedRequests(userId: string, status?: CollaborationStatus) {
    const where: any = { receiverId: userId };
    if (status) {
      where.status = status;
    }

    return this.prisma.collaborationRequest.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  // 보낸 협업 요청 목록
  async getSentRequests(userId: string, status?: CollaborationStatus) {
    const where: any = { senderId: userId };
    if (status) {
      where.status = status;
    }

    return this.prisma.collaborationRequest.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  // 협업 요청 상태 업데이트
  async updateStatus(requestId: string, userId: string, dto: UpdateCollaborationStatusDto) {
    const request = await this.prisma.collaborationRequest.findUnique({
      where: { id: requestId },
    });

    if (!request) {
      throw new NotFoundException('협업 요청을 찾을 수 없습니다.');
    }

    // 권한 확인
    if (dto.status === 'CANCELLED') {
      // 취소는 보낸 사람만 가능
      if (request.senderId !== userId) {
        throw new ForbiddenException('본인이 보낸 요청만 취소할 수 있습니다.');
      }
    } else {
      // 수락/거절은 받는 사람만 가능
      if (request.receiverId !== userId) {
        throw new ForbiddenException('본인이 받은 요청만 수락/거절할 수 있습니다.');
      }
    }

    // 이미 처리된 요청인지 확인
    if (request.status !== 'PENDING') {
      throw new BadRequestException('이미 처리된 요청입니다.');
    }

    // 상태 업데이트
    const updated = await this.prisma.collaborationRequest.update({
      where: { id: requestId },
      data: { status: dto.status },
    });

    // 알림 생성
    const notificationUserId = dto.status === 'CANCELLED' ? request.receiverId : request.senderId;
    const statusLabel = {
      ACCEPTED: '수락',
      DECLINED: '거절',
      CANCELLED: '취소',
    }[dto.status];

    await this.prisma.notification.create({
      data: {
        userId: notificationUserId,
        type: 'collaboration_update',
        title: `협업 요청 ${statusLabel}`,
        message: `"${request.title}" 요청이 ${statusLabel}되었습니다.`,
        relatedUserId: userId,
      },
    });

    return updated;
  }

  // 협업 요청 상세 조회
  async getRequest(requestId: string, userId: string) {
    const request = await this.prisma.collaborationRequest.findUnique({
      where: { id: requestId },
    });

    if (!request) {
      throw new NotFoundException('협업 요청을 찾을 수 없습니다.');
    }

    // 권한 확인 (보낸 사람 또는 받는 사람만 조회 가능)
    if (request.senderId !== userId && request.receiverId !== userId) {
      throw new ForbiddenException('이 요청을 조회할 권한이 없습니다.');
    }

    return request;
  }

  // 협업 가능한 사용자 검색
  async findCollaborators(params: {
    profession?: string;
    skills?: string[];
    isOpenToWork?: boolean;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const { profession, skills, isOpenToWork, search, page = 1, limit = 20 } = params;
    const skip = (page - 1) * limit;

    const where: any = {
      isOpenToCollaborate: true,
    };

    if (profession) {
      where.profession = profession;
    }

    if (skills && skills.length > 0) {
      where.skills = { hasSome: skills };
    }

    if (isOpenToWork !== undefined) {
      where.isOpenToWork = isOpenToWork;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { username: { contains: search, mode: 'insensitive' } },
        { bio: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [profiles, total] = await Promise.all([
      this.prisma.profile.findMany({
        where,
        skip,
        take: limit,
        orderBy: { updatedAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              email: true,
            },
          },
        },
      }),
      this.prisma.profile.count({ where }),
    ]);

    return {
      profiles,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
