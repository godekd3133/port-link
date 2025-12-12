import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('dashboard')
@Controller('dashboard')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class DashboardController {
  constructor(private dashboardService: DashboardService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Get user dashboard statistics' })
  getStats(@CurrentUser() user: any) {
    return this.dashboardService.getStats(user.userId);
  }

  @Get('posts/:postId/stats')
  @ApiOperation({ summary: 'Get statistics for a specific post' })
  getPostStats(@Param('postId') postId: string, @CurrentUser() user: any) {
    return this.dashboardService.getPostStats(postId, user.userId);
  }

  @Get('engagement')
  @ApiOperation({ summary: 'Get user engagement statistics' })
  getEngagementStats(@CurrentUser() user: any) {
    return this.dashboardService.getEngagementStats(user.userId);
  }
}
