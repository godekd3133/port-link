import { Controller, Post, Body, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AiService } from './ai.service';
import { AiWritingAssistDto, AiWritingResponseDto } from './dto/ai-writing.dto';
import { AiEvaluateDto, AiEvaluateResponseDto } from './dto/ai-evaluate.dto';

@ApiTags('AI')
@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Get('status')
  @ApiOperation({ summary: 'AI 기능 활성화 상태 확인' })
  @ApiResponse({ status: 200, description: 'AI 기능 상태' })
  getStatus() {
    return {
      enabled: this.aiService.isEnabled(),
      message: this.aiService.isEnabled()
        ? 'AI 기능이 활성화되어 있습니다.'
        : 'AI 기능이 비활성화되어 있습니다. OPENAI_API_KEY를 설정하세요.',
    };
  }

  @Post('writing/assist')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'AI 글쓰기 도우미' })
  @ApiResponse({ status: 200, type: AiWritingResponseDto })
  async assistWriting(@Body() dto: AiWritingAssistDto): Promise<AiWritingResponseDto> {
    return this.aiService.assistWriting(dto);
  }

  @Post('evaluate')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '포트폴리오 AI 평가' })
  @ApiResponse({ status: 200, type: AiEvaluateResponseDto })
  async evaluatePortfolio(@Body() dto: AiEvaluateDto): Promise<AiEvaluateResponseDto> {
    return this.aiService.evaluatePortfolio(dto);
  }

  @Post('interview-questions')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '포트폴리오 기반 면접 질문 생성' })
  @ApiResponse({ status: 200, description: '면접 질문 목록' })
  async generateInterviewQuestions(@Body() dto: AiEvaluateDto) {
    return this.aiService.generateInterviewQuestions(dto);
  }
}
