import {
  Controller,
  Post,
  Delete,
  Get,
  Param,
  Query,
  UseGuards,
  Request,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { FollowsService } from './follows.service';

@ApiTags('follows')
@Controller('follows')
export class FollowsController {
  constructor(private readonly followsService: FollowsService) {}

  @Post(':userId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Follow a user' })
  async follow(@Request() req, @Param('userId') userId: string) {
    return this.followsService.follow(req.user.id, userId);
  }

  @Delete(':userId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Unfollow a user' })
  async unfollow(@Request() req, @Param('userId') userId: string) {
    return this.followsService.unfollow(req.user.id, userId);
  }

  @Get(':userId/followers')
  @ApiOperation({ summary: 'Get followers of a user' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getFollowers(
    @Param('userId') userId: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.followsService.getFollowers(userId, page, limit);
  }

  @Get(':userId/following')
  @ApiOperation({ summary: 'Get users that a user is following' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getFollowing(
    @Param('userId') userId: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.followsService.getFollowing(userId, page, limit);
  }

  @Get(':userId/stats')
  @ApiOperation({ summary: 'Get follow stats for a user' })
  async getFollowStats(@Param('userId') userId: string) {
    return this.followsService.getFollowStats(userId);
  }

  @Get(':userId/is-following/:targetId')
  @ApiOperation({ summary: 'Check if user is following another user' })
  async isFollowing(@Param('userId') userId: string, @Param('targetId') targetId: string) {
    const isFollowing = await this.followsService.isFollowing(userId, targetId);
    return { isFollowing };
  }

  @Get('suggestions')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get suggested users to follow' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getSuggestions(
    @Request() req,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    return this.followsService.getSuggestedUsers(req.user.id, limit);
  }

  @Get(':userId/mutual/:otherUserId')
  @ApiOperation({ summary: 'Get mutual followers between two users' })
  async getMutualFollowers(
    @Param('userId') userId: string,
    @Param('otherUserId') otherUserId: string,
  ) {
    return this.followsService.getMutualFollowers(userId, otherUserId);
  }
}
