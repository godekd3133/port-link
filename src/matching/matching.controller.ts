import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { MatchingService } from './matching.service';

@Controller('matching')
export class MatchingController {
  constructor(private matchingService: MatchingService) {}

  // 협업자 추천
  @UseGuards(JwtAuthGuard)
  @Get('collaborators')
  async findCollaborators(
    @Request() req,
    @Query('profession') profession?: string,
    @Query('skills') skills?: string,
    @Query('limit') limit?: string,
  ) {
    const skillsArray = skills ? skills.split(',').map((s) => s.trim()) : [];

    return this.matchingService.findMatchingCollaborators(req.user.userId, {
      targetProfession: profession,
      requiredSkills: skillsArray,
      limit: limit ? parseInt(limit, 10) : 10,
    });
  }

  // 프로젝트 팀 추천
  @UseGuards(JwtAuthGuard)
  @Post('team-recommendation')
  async recommendTeam(
    @Request() req,
    @Body()
    body: {
      category: string;
      skills: string[];
      description?: string;
    },
  ) {
    return this.matchingService.recommendTeamForProject(req.user.userId, body);
  }

  // 비슷한 프로필 찾기
  @UseGuards(JwtAuthGuard)
  @Get('similar-profiles')
  async findSimilar(@Request() req, @Query('limit') limit?: string) {
    return this.matchingService.findSimilarProfiles(
      req.user.userId,
      limit ? parseInt(limit, 10) : 10,
    );
  }

  // 멘토 찾기
  @UseGuards(JwtAuthGuard)
  @Get('mentors')
  async findMentors(
    @Request() req,
    @Query('skill') skill: string,
    @Query('limit') limit?: string,
  ) {
    if (!skill) {
      return { error: 'skill parameter is required' };
    }

    return this.matchingService.findMentors(
      req.user.userId,
      skill,
      limit ? parseInt(limit, 10) : 5,
    );
  }
}
