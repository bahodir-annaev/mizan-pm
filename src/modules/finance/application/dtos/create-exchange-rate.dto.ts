import { IsDateString, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateExchangeRateDto {
  @IsDateString()
  rateDate: string;

  @IsNumber()
  @Min(0.01)
  uzsPerUsd: number;

  @IsOptional()
  @IsString()
  source?: string;
}
