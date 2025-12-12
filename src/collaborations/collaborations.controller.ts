import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CollaborationsService } from './collaborations.service';
import {
  CreateCollaborationRequestDto,
  UpdateCollaborationStatusDto,
} from './dto/create-collaboration.dto';
import { CollaborationStatus, Profession } from '../common/enums';

@ApiTags('Collaborations')
@Controller('collaborations')
export class CollaborationsController {
  constructor(private readonly collaborationsService: CollaborationsService) {}

  @Post('requests')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '협업 요청 생성' })
  async createRequest(@Request() req, @Body() dto: CreateCollaborationRequestDto) {
    return this.collaborationsService.create(req.user.id, dto);
  }

  @Get('requests/received')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '받은 협업 요청 목록' })
  @ApiQuery({ name: 'status', required: false, enum: CollaborationStatus })
  async getReceivedRequests(@Request() req, @Query('status') status?: CollaborationStatus) {
    return this.collaborationsService.getReceivedRequests(req.user.id, status);
  }

  @Get('requests/sent')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '보낸 협업 요청 목록' })
  @ApiQuery({ name: 'status', required: false, enum: CollaborationStatus })
  async getSentRequests(@Request() req, @Query('status') status?: CollaborationStatus) {
    return this.collaborationsService.getSentRequests(req.user.id, status);
  }

  @Get('requests/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '협업 요청 상세 조회' })
  async getRequest(@Request() req, @Param('id') id: string) {
    return this.collaborationsService.getRequest(id, req.user.id);
  }

  @Patch('requests/:id/status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '협업 요청 상태 변경 (수락/거절/취소)' })
  async updateRequestStatus(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: UpdateCollaborationStatusDto,
  ) {
    return this.collaborationsService.updateStatus(id, req.user.id, dto);
  }

  @Get('discover')
  @ApiOperation({ summary: '협업 가능한 사용자 검색' })
  @ApiQuery({ name: 'profession', required: false, enum: Profession })
  @ApiQuery({ name: 'skills', required: false, type: [String] })
  @ApiQuery({ name: 'isOpenToWork', required: false, type: Boolean })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async findCollaborators(
    @Query('profession') profession?: Profession,
    @Query('skills') skills?: string | string[],
    @Query('isOpenToWork') isOpenToWork?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.collaborationsService.findCollaborators({
      profession,
      skills: skills ? (Array.isArray(skills) ? skills : [skills]) : undefined,
      isOpenToWork: isOpenToWork === 'true' ? true : isOpenToWork === 'false' ? false : undefined,
      search,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }
}
