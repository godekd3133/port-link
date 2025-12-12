import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PortfolioCoachService } from './portfolio-coach.service';

@ApiTags('Portfolio Coach')
@Controller('portfolio-coach')
export class PortfolioCoachController {
  constructor(private portfolioCoachService: PortfolioCoachService) {}

  @Get('completeness')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '프로필 완성도 점수 조회' })
  async getCompleteness(@Request() req) {
    return this.portfolioCoachService.getProfileCompleteness(req.user.userId);
  }

  @Get('analyze')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '프로필 종합 분석 (AI 코칭)' })
  async analyzeProfile(@Request() req) {
    return this.portfolioCoachService.analyzeProfile(req.user.userId);
  }

  @Get('export-resume')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '이력서 데이터 내보내기' })
  async exportResume(@Request() req) {
    return this.portfolioCoachService.exportResume(req.user.userId);
  }
}
