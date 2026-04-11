import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class UpdateOverheadCostDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  amountUzs?: number;

  @IsOptional()
  @IsString()
  description?: string;
}
