import { IsDateString, IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateTimeEntryDto {
  @ApiPropertyOptional({ description: 'ISO 8601 date string' })
  @IsDateString()
  @IsOptional()
  startTime?: string;

  @ApiPropertyOptional({ description: 'ISO 8601 date string' })
  @IsDateString()
  @IsOptional()
  endTime?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;
}
