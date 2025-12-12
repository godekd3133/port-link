import { IsString, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum WritingAction {
  IMPROVE = 'improve',
  EXPAND = 'expand',
  SUMMARIZE = 'summarize',
  FIX_GRAMMAR = 'fix_grammar',
  MAKE_PROFESSIONAL = 'make_professional',
  ADD_DETAILS = 'add_details',
  GENERATE_INTRO = 'generate_intro',
  GENERATE_TECH_DESC = 'generate_tech_desc',
}

export class AiWritingAssistDto {
  @ApiProperty({ description: '선택한 텍스트 또는 전체 내용' })
  @IsString()
  content: string;

  @ApiProperty({ enum: WritingAction, description: '수행할 작업' })
  @IsEnum(WritingAction)
  action: WritingAction;

  @ApiPropertyOptional({ description: '프로젝트 제목 (컨텍스트용)' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ description: '기술 스택 (컨텍스트용)' })
  @IsOptional()
  @IsString({ each: true })
  techStack?: string[];
}

export class AiWritingResponseDto {
  @ApiProperty({ description: '생성된 텍스트' })
  result: string;

  @ApiProperty({ description: '사용된 토큰 수' })
  tokensUsed: number;
}
