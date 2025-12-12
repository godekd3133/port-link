import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { EndorsementsService } from './endorsements.service';

@Controller('endorsements')
export class EndorsementsController {
  constructor(private endorsementsService: EndorsementsService) {}

  // 스킬 추천하기
  @UseGuards(JwtAuthGuard)
  @Post('skills')
  async endorseSkill(
    @Request() req,
    @Body()
    body: {
      userId: string;
      skill: string;
      comment?: string;
      relationship?: string;
    },
  ) {
    return this.endorsementsService.endorseSkill(
      req.user.userId,
      body.userId,
      body.skill,
      body.comment,
      body.relationship,
    );
  }

  // 스킬 추천 취소
  @UseGuards(JwtAuthGuard)
  @Delete('skills/:id')
  async removeEndorsement(@Request() req, @Param('id') id: string) {
    return this.endorsementsService.removeEndorsement(req.user.userId, id);
  }

  // 특정 사용자의 스킬 추천 목록
  @Get('skills/user/:userId')
  async getSkillEndorsements(@Param('userId') userId: string) {
    return this.endorsementsService.getEndorsementsForUser(userId);
  }

  // 내가 한 추천 목록
  @UseGuards(JwtAuthGuard)
  @Get('skills/my-endorsements')
  async getMyEndorsements(@Request() req) {
    return this.endorsementsService.getMyEndorsements(req.user.userId);
  }

  // 추천서 작성
  @UseGuards(JwtAuthGuard)
  @Post('recommendations')
  async createRecommendation(
    @Request() req,
    @Body()
    body: {
      recipientId: string;
      content: string;
      relationship: string;
      workPeriod?: string;
      projectTitle?: string;
    },
  ) {
    return this.endorsementsService.createRecommendation(req.user.userId, body);
  }

  // 추천서 수정
  @UseGuards(JwtAuthGuard)
  @Patch('recommendations/:id')
  async updateRecommendation(
    @Request() req,
    @Param('id') id: string,
    @Body()
    body: {
      content?: string;
      relationship?: string;
      workPeriod?: string;
      projectTitle?: string;
    },
  ) {
    return this.endorsementsService.updateRecommendation(req.user.userId, id, body);
  }

  // 추천서 삭제
  @UseGuards(JwtAuthGuard)
  @Delete('recommendations/:id')
  async deleteRecommendation(@Request() req, @Param('id') id: string) {
    return this.endorsementsService.deleteRecommendation(req.user.userId, id);
  }

  // 특정 사용자의 추천서 목록 (공개만)
  @Get('recommendations/user/:userId')
  async getRecommendations(@Param('userId') userId: string) {
    return this.endorsementsService.getRecommendationsForUser(userId, false);
  }

  // 내가 받은 추천서 (비공개 포함)
  @UseGuards(JwtAuthGuard)
  @Get('recommendations/received')
  async getMyRecommendations(@Request() req) {
    return this.endorsementsService.getRecommendationsForUser(req.user.userId, true);
  }

  // 추천서 승인
  @UseGuards(JwtAuthGuard)
  @Patch('recommendations/:id/verify')
  async verifyRecommendation(@Request() req, @Param('id') id: string) {
    return this.endorsementsService.verifyRecommendation(req.user.userId, id);
  }

  // 추천서 공개/비공개 설정
  @UseGuards(JwtAuthGuard)
  @Patch('recommendations/:id/visibility')
  async setVisibility(
    @Request() req,
    @Param('id') id: string,
    @Body() body: { isPublic: boolean },
  ) {
    return this.endorsementsService.setRecommendationVisibility(
      req.user.userId,
      id,
      body.isPublic,
    );
  }
}
