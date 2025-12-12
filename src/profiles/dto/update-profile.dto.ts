import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsUrl,
  IsArray,
  IsOptional,
  MaxLength,
  IsEnum,
  IsInt,
  IsBoolean,
  Min,
  Max,
  ValidateIf,
} from 'class-validator';
import { Profession } from '../../common/enums';

export class UpdateProfileDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  @MaxLength(50)
  name?: string;

  @ApiPropertyOptional({ description: '사용자명 (@username)' })
  @IsString()
  @IsOptional()
  @MaxLength(30)
  username?: string;

  @ApiPropertyOptional({ description: '직함/역할' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  title?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  @MaxLength(500)
  bio?: string;

  @ApiPropertyOptional({ description: '위치 (예: 서울, 대한민국)' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  location?: string;

  @ApiPropertyOptional()
  @ValidateIf((o) => o.avatar !== '')
  @IsUrl()
  @IsOptional()
  avatar?: string;

  @ApiPropertyOptional({
    enum: Profession,
    description: '주 직종',
    example: 'DEVELOPER',
  })
  @IsEnum(Profession)
  @IsOptional()
  profession?: Profession;

  @ApiPropertyOptional({
    enum: Profession,
    description: '부 직종 (옵션)',
    example: 'DESIGNER',
  })
  @IsEnum(Profession)
  @IsOptional()
  secondaryProfession?: Profession;

  @ApiPropertyOptional({
    type: [String],
    description: '범용 스킬/도구 (Figma, Excel, Premiere 등)',
    example: ['Figma', 'Photoshop', 'Illustrator'],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  skills?: string[];

  @ApiPropertyOptional({
    type: [String],
    description: '기술 스택 (개발자용)',
    example: ['React', 'Node.js', 'TypeScript'],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  techStack?: string[];

  @ApiPropertyOptional({ description: '경력 연수', example: 3 })
  @IsInt()
  @Min(0)
  @Max(50)
  @IsOptional()
  yearsOfExperience?: number;

  @ApiPropertyOptional({ description: '구직 중 여부' })
  @IsBoolean()
  @IsOptional()
  isOpenToWork?: boolean;

  @ApiPropertyOptional({ description: '협업 제안 받기' })
  @IsBoolean()
  @IsOptional()
  isOpenToCollaborate?: boolean;

  // 기존 소셜 링크들
  @ApiPropertyOptional()
  @ValidateIf((o) => o.githubUrl !== '')
  @IsUrl()
  @IsOptional()
  githubUrl?: string;

  @ApiPropertyOptional()
  @ValidateIf((o) => o.websiteUrl !== '')
  @IsUrl()
  @IsOptional()
  websiteUrl?: string;

  @ApiPropertyOptional()
  @ValidateIf((o) => o.linkedinUrl !== '')
  @IsUrl()
  @IsOptional()
  linkedinUrl?: string;

  // 새로운 소셜 링크들
  @ApiPropertyOptional({ description: 'Behance URL (디자이너용)' })
  @ValidateIf((o) => o.behanceUrl !== '')
  @IsUrl()
  @IsOptional()
  behanceUrl?: string;

  @ApiPropertyOptional({ description: 'Dribbble URL (디자이너용)' })
  @ValidateIf((o) => o.dribbbleUrl !== '')
  @IsUrl()
  @IsOptional()
  dribbbleUrl?: string;

  @ApiPropertyOptional({ description: 'Instagram URL' })
  @ValidateIf((o) => o.instagramUrl !== '')
  @IsUrl()
  @IsOptional()
  instagramUrl?: string;

  @ApiPropertyOptional({ description: 'YouTube URL' })
  @ValidateIf((o) => o.youtubeUrl !== '')
  @IsUrl()
  @IsOptional()
  youtubeUrl?: string;

  @ApiPropertyOptional({ description: 'Twitter/X URL' })
  @ValidateIf((o) => o.twitterUrl !== '')
  @IsUrl()
  @IsOptional()
  twitterUrl?: string;

  @ApiPropertyOptional({ description: 'Notion URL' })
  @ValidateIf((o) => o.notionUrl !== '')
  @IsUrl()
  @IsOptional()
  notionUrl?: string;
}
