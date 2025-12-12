import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsUUID, MaxLength, MinLength } from 'class-validator';

export class CreateCollaborationRequestDto {
  @ApiProperty({ description: '받는 사람 User ID' })
  @IsUUID()
  receiverId: string;

  @ApiPropertyOptional({ description: '관련 프로젝트 ID (옵션)' })
  @IsUUID()
  @IsOptional()
  postId?: string;

  @ApiProperty({ description: '제안 제목', example: '프로젝트 협업 제안드립니다' })
  @IsString()
  @MinLength(5)
  @MaxLength(100)
  title: string;

  @ApiProperty({ description: '제안 내용' })
  @IsString()
  @MinLength(10)
  @MaxLength(2000)
  message: string;

  @ApiPropertyOptional({ description: '제안하는 역할', example: 'UI/UX 디자인' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  proposedRole?: string;
}

export class UpdateCollaborationStatusDto {
  @ApiProperty({
    description: '협업 요청 상태',
    enum: ['ACCEPTED', 'DECLINED', 'CANCELLED'],
  })
  @IsString()
  status: 'ACCEPTED' | 'DECLINED' | 'CANCELLED';
}
