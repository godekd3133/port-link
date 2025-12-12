import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsArray,
  IsUrl,
  IsOptional,
  IsEnum,
  MaxLength,
  MinLength,
  ValidateIf,
  IsBoolean,
  IsDateString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ProjectCategory, Profession } from '../../common/enums';

// 협업자 추가 DTO
export class ContributorDto {
  @ApiProperty({ description: '협업자 프로필 ID 또는 username' })
  @IsString()
  profileIdOrUsername: string;

  @ApiProperty({ description: '역할', example: 'UI 디자인' })
  @IsString()
  @MaxLength(100)
  role: string;

  @ApiProperty({ enum: Profession, description: '협업자 직종' })
  @IsEnum(Profession)
  profession: Profession;

  @ApiPropertyOptional({ description: '기여 내용 설명' })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  contribution?: string;
}

export class CreatePostDto {
  @ApiProperty({ example: '나의 첫 프로젝트' })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title: string;

  @ApiPropertyOptional({ example: '프로젝트 요약입니다' })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  summary?: string;

  @ApiProperty({ example: '프로젝트 내용입니다...' })
  @IsString()
  @MinLength(1)
  content: string;

  @ApiPropertyOptional({ example: 'https://example.com/cover.jpg' })
  @ValidateIf((o) => o.coverImage !== '')
  @IsUrl()
  @IsOptional()
  coverImage?: string;

  @ApiPropertyOptional({ type: [String], description: 'Media URLs (images/videos)' })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  media?: string[];

  // 프로젝트 카테고리
  @ApiPropertyOptional({
    enum: ProjectCategory,
    description: '프로젝트 카테고리',
    example: 'WEB_APP',
  })
  @IsEnum(ProjectCategory)
  @IsOptional()
  category?: ProjectCategory;

  // 범용 스킬 (모든 직종용)
  @ApiPropertyOptional({
    type: [String],
    description: '사용한 스킬/도구',
    example: ['Figma', 'React', 'Node.js'],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  skills?: string[];

  // 기존 techStack (하위 호환성)
  @ApiPropertyOptional({ type: [String], example: ['React', 'Node.js'] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  techStack?: string[];

  // 팀 프로젝트 여부
  @ApiPropertyOptional({ description: '팀 프로젝트 여부' })
  @IsBoolean()
  @IsOptional()
  isTeamProject?: boolean;

  // 협업자 목록
  @ApiPropertyOptional({
    type: [ContributorDto],
    description: '프로젝트 협업자 목록',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ContributorDto)
  @IsOptional()
  contributors?: ContributorDto[];

  // 프로젝트 기간
  @ApiPropertyOptional({ description: '프로젝트 시작일', example: '2024-01-01' })
  @IsDateString()
  @IsOptional()
  projectStartDate?: string;

  @ApiPropertyOptional({ description: '프로젝트 종료일', example: '2024-06-30' })
  @IsDateString()
  @IsOptional()
  projectEndDate?: string;

  // 외부 링크들
  @ApiPropertyOptional({ example: 'https://github.com/user/repo' })
  @ValidateIf((o) => o.repositoryUrl !== '')
  @IsUrl()
  @IsOptional()
  repositoryUrl?: string;

  @ApiPropertyOptional({ example: 'https://demo.example.com' })
  @ValidateIf((o) => o.demoUrl !== '')
  @IsUrl()
  @IsOptional()
  demoUrl?: string;

  @ApiPropertyOptional({ description: 'Behance 프로젝트 링크' })
  @ValidateIf((o) => o.behanceUrl !== '')
  @IsUrl()
  @IsOptional()
  behanceUrl?: string;

  @ApiPropertyOptional({ description: 'Figma 파일 링크' })
  @ValidateIf((o) => o.figmaUrl !== '')
  @IsUrl()
  @IsOptional()
  figmaUrl?: string;

  @ApiPropertyOptional({ description: 'YouTube 영상 링크' })
  @ValidateIf((o) => o.youtubeUrl !== '')
  @IsUrl()
  @IsOptional()
  youtubeUrl?: string;

  @ApiPropertyOptional({ description: '기타 외부 링크' })
  @ValidateIf((o) => o.externalUrl !== '')
  @IsUrl()
  @IsOptional()
  externalUrl?: string;

  @ApiPropertyOptional({ enum: ['DRAFT', 'PUBLISHED', 'HIDDEN'] })
  @IsEnum(['DRAFT', 'PUBLISHED', 'HIDDEN'])
  @IsOptional()
  status?: 'DRAFT' | 'PUBLISHED' | 'HIDDEN';
}
