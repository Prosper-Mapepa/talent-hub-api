import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ReportType, ReportReason } from '../entities/content-report.entity';

export class CreateReportDto {
  @ApiProperty({
    description: 'Type of content being reported',
    enum: ReportType,
    example: ReportType.MESSAGE,
  })
  @IsEnum(ReportType)
  @IsNotEmpty()
  type: ReportType;

  @ApiProperty({
    description: 'ID of the user being reported (if reporting a user)',
    required: false,
    example: 'uuid',
  })
  @IsUUID()
  @IsOptional()
  reportedUserId?: string;

  @ApiProperty({
    description: 'ID of the specific content being reported (message, project, etc.)',
    required: false,
    example: 'uuid',
  })
  @IsUUID()
  @IsOptional()
  contentId?: string;

  @ApiProperty({
    description: 'Reason for reporting',
    enum: ReportReason,
    example: ReportReason.INAPPROPRIATE_CONTENT,
  })
  @IsEnum(ReportReason)
  @IsNotEmpty()
  reason: ReportReason;

  @ApiProperty({
    description: 'Additional details about the report',
    required: false,
    maxLength: 1000,
    example: 'This user sent inappropriate messages',
  })
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  description?: string;
}
