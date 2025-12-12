import { IsString, IsOptional, IsArray, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Profession, ProjectCategory } from '../../common/enums';

export class AiEvaluateDto {
  @ApiProperty({ description: '포트폴리오 제목' })
  @IsString()
  title: string;

  @ApiProperty({ description: '포트폴리오 내용 (마크다운)' })
  @IsString()
  content: string;

  @ApiPropertyOptional({ description: '요약' })
  @IsOptional()
  @IsString()
  summary?: string;

  @ApiPropertyOptional({
    enum: Profession,
    description: '작성자의 직종',
    example: 'DESIGNER',
  })
  @IsEnum(Profession)
  @IsOptional()
  profession?: Profession;

  @ApiPropertyOptional({
    enum: ProjectCategory,
    description: '프로젝트 카테고리',
    example: 'DESIGN',
  })
  @IsEnum(ProjectCategory)
  @IsOptional()
  category?: ProjectCategory;

  @ApiPropertyOptional({
    description: '사용한 스킬/도구',
    type: [String],
    example: ['Figma', 'Photoshop'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  skills?: string[];

  @ApiPropertyOptional({ description: '기술 스택 (개발자용)' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  techStack?: string[];

  @ApiPropertyOptional({ description: '데모 URL' })
  @IsOptional()
  @IsString()
  demoUrl?: string;

  @ApiPropertyOptional({ description: '저장소 URL' })
  @IsOptional()
  @IsString()
  repositoryUrl?: string;

  @ApiPropertyOptional({ description: 'Behance URL' })
  @IsOptional()
  @IsString()
  behanceUrl?: string;

  @ApiPropertyOptional({ description: 'Figma URL' })
  @IsOptional()
  @IsString()
  figmaUrl?: string;

  @ApiPropertyOptional({ description: 'YouTube URL' })
  @IsOptional()
  @IsString()
  youtubeUrl?: string;
}

export class EvaluationCategory {
  @ApiProperty({ description: '점수 (0-100)' })
  score: number;

  @ApiProperty({ description: '피드백' })
  feedback: string;

  @ApiProperty({ description: '개선 제안', type: [String] })
  suggestions: string[];
}

export class AiEvaluateResponseDto {
  @ApiProperty({ description: '전체 점수 (0-100)' })
  overallScore: number;

  @ApiProperty({ description: '한줄 평가' })
  summary: string;

  @ApiProperty({ description: '완성도 평가' })
  completeness: EvaluationCategory;

  @ApiProperty({ description: '기술 어필 평가' })
  technicalAppeal: EvaluationCategory;

  @ApiProperty({ description: '가독성 평가' })
  readability: EvaluationCategory;

  @ApiProperty({ description: '채용 매력도 평가' })
  hiringAppeal: EvaluationCategory;

  @ApiProperty({ description: '강점', type: [String] })
  strengths: string[];

  @ApiProperty({ description: '개선 필요 사항', type: [String] })
  improvements: string[];

  @ApiProperty({ description: '사용된 토큰 수' })
  tokensUsed: number;
}
