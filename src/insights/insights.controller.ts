import {
  Controller,
  Get,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { InsightsService } from './insights.service';

@Controller('insights')
export class InsightsController {
  constructor(private insightsService: InsightsService) {}

  // 내 커리어 인사이트
  @UseGuards(JwtAuthGuard)
  @Get('career')
  async getCareerInsights(@Request() req) {
    return this.insightsService.getCareerInsights(req.user.userId);
  }

  // 스킬 트렌드
  @Get('skill-trends')
  async getSkillTrends(@Query('profession') profession?: string) {
    return this.insightsService.getSkillTrends(profession);
  }
}
