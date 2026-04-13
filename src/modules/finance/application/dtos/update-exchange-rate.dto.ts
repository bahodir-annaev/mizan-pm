import { IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateExchangeRateDto {
  @ApiPropertyOptional({ example: 12900.0, minimum: 0.01, description: 'Updated UZS per 1 USD' })
  @IsOptional()
  @IsNumber()
  @Min(0.01)
  uzsPerUsd?: number;

  @ApiPropertyOptional({ example: 'CBU' })
  @IsOptional()
  @IsString()
  source?: string;
}
