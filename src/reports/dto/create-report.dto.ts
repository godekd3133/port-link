import { ApiProperty } from '@nestjs/swagger';
import { ReportType } from '@prisma/client';
import { IsEnum, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class CreateReportDto {
  @ApiProperty({ description: 'ID of the post being reported' })
  @IsUUID()
  postId: string;

  @ApiProperty({ enum: ReportType })
  @IsEnum(ReportType)
  type: ReportType;

  @ApiProperty({ description: 'Reason for the report', minLength: 10, maxLength: 500 })
  @IsString()
  @MinLength(10)
  @MaxLength(500)
  reason: string;
}
