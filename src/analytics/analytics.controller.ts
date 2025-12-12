import {
  Controller,
  Get,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AnalyticsService } from './analytics.service';

@Controller('analytics')
export class AnalyticsController {
  constructor(private analyticsService: AnalyticsService) {}

  // 내 프로젝트 타임라인
  @UseGuards(JwtAuthGuard)
  @Get('timeline')
  async getTimeline(@Request() req) {
    return this.analyticsService.getProjectTimeline(req.user.userId);
  }

  // 특정 사용자의 타임라인 (공개)
  @Get('timeline/:userId')
  async getUserTimeline(@Param('userId') userId: string) {
    return this.analyticsService.getProjectTimeline(userId);
  }

  // 내 임팩트 메트릭스
  @UseGuards(JwtAuthGuard)
  @Get('impact')
  async getImpactMetrics(@Request() req) {
    return this.analyticsService.getImpactMetrics(req.user.userId);
  }

  // 특정 포스트 분석
  @UseGuards(JwtAuthGuard)
  @Get('posts/:postId')
  async getPostAnalytics(@Param('postId') postId: string) {
    return this.analyticsService.getPostAnalytics(postId);
  }

  // 스킬별 프로젝트 분포
  @UseGuards(JwtAuthGuard)
  @Get('skills')
  async getSkillDistribution(@Request() req) {
    return this.analyticsService.getSkillDistribution(req.user.userId);
  }
}
