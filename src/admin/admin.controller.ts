import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { ReportStatus, UserRole } from '@prisma/client';

@ApiTags('admin')
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@ApiBearerAuth()
export class AdminController {
  constructor(private adminService: AdminService) {}

  @Get('reports')
  @ApiOperation({ summary: 'List all reports (Admin only)' })
  @ApiQuery({ name: 'status', required: false, enum: ReportStatus })
  listReports(@Query('status') status?: ReportStatus) {
    return this.adminService.listReports(status);
  }

  @Get('reports/:id')
  @ApiOperation({ summary: 'Get report details (Admin only)' })
  getReport(@Param('id') id: string) {
    return this.adminService.getReport(id);
  }

  @Post('reports/:id/handle')
  @ApiOperation({ summary: 'Handle a report (Admin only)' })
  handleReport(
    @Param('id') id: string,
    @Body() body: { action: 'hide' | 'keep'; adminNote?: string },
  ) {
    return this.adminService.handleReport(id, body.action, body.adminNote);
  }

  @Post('posts/:postId/editor-pick')
  @ApiOperation({ summary: 'Set/unset post as editor pick (Admin only)' })
  setEditorPick(@Param('postId') postId: string, @Body() body: { isEditorPick: boolean }) {
    return this.adminService.setEditorPick(postId, body.isEditorPick);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get platform statistics (Admin only)' })
  getUserStats() {
    return this.adminService.getUserStats();
  }
}
