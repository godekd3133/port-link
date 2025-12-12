import { Controller, Post, Get, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { BookmarksService } from './bookmarks.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('bookmarks')
@Controller()
export class BookmarksController {
  constructor(private bookmarksService: BookmarksService) {}

  @Post('posts/:postId/bookmarks/toggle')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Toggle bookmark on a post' })
  toggle(@Param('postId') postId: string, @CurrentUser() user: any) {
    return this.bookmarksService.toggle(postId, user.userId);
  }

  @Get('bookmarks')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all bookmarked posts for current user' })
  getUserBookmarks(@CurrentUser() user: any) {
    return this.bookmarksService.getUserBookmarks(user.userId);
  }

  @Get('posts/:postId/bookmarks/check')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Check if user bookmarked the post' })
  checkUserBookmarked(@Param('postId') postId: string, @CurrentUser() user: any) {
    return this.bookmarksService.checkUserBookmarked(postId, user.userId);
  }
}
