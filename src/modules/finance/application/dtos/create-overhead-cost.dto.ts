import { IsEnum, IsInt, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';
import { OverheadCategory } from '../../domain/entities/overhead-category.enum';

export class CreateOverheadCostDto {
  @IsInt()
  @Min(2000)
  @Max(2100)
  periodYear: number;

  @IsInt()
  @Min(1)
  @Max(12)
  periodMonth: number;

  @IsEnum(OverheadCategory)
  category: OverheadCategory;

  @IsNumber()
  @Min(0)
  amountUzs: number;

  @IsOptional()
  @IsString()
  description?: string;
}
