import { IsString, IsOptional, IsBoolean, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateChecklistItemDto {
  @ApiPropertyOptional({ description: 'Checklist item title', maxLength: 500 })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  title?: string;

  @ApiPropertyOptional({ description: 'Whether the item is completed' })
  @IsBoolean()
  @IsOptional()
  isCompleted?: boolean;
}
