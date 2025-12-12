import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { FeedService } from './feed.service';

@ApiTags('feed')
@Controller('feed')
export class FeedController {
  constructor(private feedService: FeedService) {}

  @Get()
  @ApiOperation({ summary: 'Get feed with filtering and sorting' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'sortBy', required: false, enum: ['latest', 'popular', 'trending'] })
  @ApiQuery({ name: 'techStack', required: false, type: [String] })
  @ApiQuery({ name: 'search', required: false, type: String })
  getFeed(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('sortBy') sortBy?: 'latest' | 'popular' | 'trending',
    @Query('techStack') techStack?: string | string[],
    @Query('search') search?: string,
  ) {
    return this.feedService.getFeed({
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
      sortBy,
      techStack: Array.isArray(techStack) ? techStack : techStack ? [techStack] : undefined,
      search,
    });
  }

  @Get('editor-picks')
  @ApiOperation({ summary: 'Get editor picks' })
  getEditorPicks() {
    return this.feedService.getEditorPicks();
  }

  @Get('trending-tags')
  @ApiOperation({ summary: 'Get trending tags' })
  getTrendingTags() {
    return this.feedService.getTrendingTags();
  }
}
