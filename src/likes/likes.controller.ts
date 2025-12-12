import { Controller, Post, Get, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { LikesService } from './likes.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('likes')
@Controller('posts/:postId/likes')
export class LikesController {
  constructor(private likesService: LikesService) {}

  @Post('toggle')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Toggle like on a post' })
  toggle(@Param('postId') postId: string, @CurrentUser() user: any) {
    return this.likesService.toggle(postId, user.userId);
  }

  @Get()
  @ApiOperation({ summary: 'Get all likes for a post' })
  getPostLikes(@Param('postId') postId: string) {
    return this.likesService.getPostLikes(postId);
  }

  @Get('check')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Check if user liked the post' })
  checkUserLiked(@Param('postId') postId: string, @CurrentUser() user: any) {
    return this.likesService.checkUserLiked(postId, user.userId);
  }
}
