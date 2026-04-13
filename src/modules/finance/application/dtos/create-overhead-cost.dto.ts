import { IsEnum, IsInt, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OverheadCategory } from '../../domain/entities/overhead-category.enum';

export class CreateOverheadCostDto {
  @ApiProperty({ example: 2026, minimum: 2000, maximum: 2100 })
  @IsInt()
  @Min(2000)
  @Max(2100)
  periodYear: number;

  @ApiProperty({ example: 4, minimum: 1, maximum: 12 })
  @IsInt()
  @Min(1)
  @Max(12)
  periodMonth: number;

  @ApiProperty({ enum: OverheadCategory, example: OverheadCategory.RENT })
  @IsEnum(OverheadCategory)
  category: OverheadCategory;

  @ApiProperty({ example: 3500000, minimum: 0, description: 'Amount in UZS' })
  @IsNumber()
  @Min(0)
  amountUzs: number;

  @ApiPropertyOptional({ example: 'Monthly office rent' })
  @IsOptional()
  @IsString()
  description?: string;
}
