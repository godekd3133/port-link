import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Query,
  UseGuards,
  Request,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GitHubService } from './github.service';

@Controller('github')
export class GitHubController {
  constructor(private githubService: GitHubService) {}

  // GitHub OAuth 시작
  @UseGuards(JwtAuthGuard)
  @Get('connect')
  async connect(@Request() req, @Res() res: Response) {
    const url = this.githubService.getOAuthUrl(req.user.userId);
    res.redirect(url);
  }

  // OAuth 콜백 URL (프론트엔드용)
  @UseGuards(JwtAuthGuard)
  @Get('oauth-url')
  async getOAuthUrl(@Request() req) {
    return {
      url: this.githubService.getOAuthUrl(req.user.userId),
    };
  }

  // OAuth 콜백 처리
  @Get('callback')
  async handleCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Res() res: Response,
  ) {
    try {
      await this.githubService.handleOAuthCallback(code, state);
      // 성공 시 프론트엔드로 리다이렉트
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      res.redirect(`${frontendUrl}/#/settings/profile?github=connected`);
    } catch (error) {
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      res.redirect(`${frontendUrl}/#/settings/profile?github=error`);
    }
  }

  // 연동 상태 확인
  @UseGuards(JwtAuthGuard)
  @Get('status')
  async getStatus(@Request() req) {
    return this.githubService.getIntegrationStatus(req.user.userId);
  }

  // 연동 해제
  @UseGuards(JwtAuthGuard)
  @Delete('disconnect')
  async disconnect(@Request() req) {
    return this.githubService.disconnect(req.user.userId);
  }

  // 레포지토리 목록 조회
  @UseGuards(JwtAuthGuard)
  @Get('repositories')
  async listRepositories(@Request() req) {
    return this.githubService.listRepositories(req.user.userId);
  }

  // 레포지토리 가져오기
  @UseGuards(JwtAuthGuard)
  @Post('import')
  async importRepository(
    @Request() req,
    @Body()
    body: {
      repoFullName: string;
      title?: string;
      summary?: string;
      content?: string;
      category?: string;
      skills?: string[];
    },
  ) {
    const { repoFullName, ...customData } = body;
    return this.githubService.importRepository(
      req.user.userId,
      repoFullName,
      customData,
    );
  }

  // 자동 동기화 설정
  @UseGuards(JwtAuthGuard)
  @Post('auto-sync')
  async setAutoSync(
    @Request() req,
    @Body() body: { enabled: boolean; settings?: any },
  ) {
    return this.githubService.setAutoSync(
      req.user.userId,
      body.enabled,
      body.settings,
    );
  }
}
