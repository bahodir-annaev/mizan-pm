import { IsDateString, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateExchangeRateDto {
  @ApiProperty({ example: '2026-04-01', description: 'Date of the exchange rate' })
  @IsDateString()
  rateDate: string;

  @ApiProperty({ example: 12750.5, minimum: 0.01, description: 'UZS per 1 USD' })
  @IsNumber()
  @Min(0.01)
  uzsPerUsd: number;

  @ApiPropertyOptional({ example: 'CBU', description: 'Source of the exchange rate' })
  @IsOptional()
  @IsString()
  source?: string;
}
