import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ReportsService } from './reports.service';
import { CreateReportDto } from './dto/create-report.dto';

@ApiTags('reports')
@Controller('reports')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ReportsController {
  constructor(private reportsService: ReportsService) {}

  @Post()
  @ApiOperation({ summary: 'Submit a report for a post' })
  create(@CurrentUser() user: any, @Body() createReportDto: CreateReportDto) {
    return this.reportsService.create(user.userId, createReportDto);
  }

  @Get('me')
  @ApiOperation({ summary: 'Get reports submitted by current user' })
  findMyReports(@CurrentUser() user: any) {
    return this.reportsService.findMyReports(user.userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single report submitted by current user' })
  getById(@Param('id') id: string, @CurrentUser() user: any) {
    return this.reportsService.getById(id, user.userId);
  }
}
