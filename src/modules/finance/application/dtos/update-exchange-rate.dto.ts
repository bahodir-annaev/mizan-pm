import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class UpdateExchangeRateDto {
  @IsOptional()
  @IsNumber()
  @Min(0.01)
  uzsPerUsd?: number;

  @IsOptional()
  @IsString()
  source?: string;
}
