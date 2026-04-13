import { IsDateString, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class CreateProjectFinancialPlanDto {
  @ApiPropertyOptional({ example: 150000000, minimum: 0, description: 'Contract value in UZS' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  contractValueUzs?: number;

  @ApiPropertyOptional({ example: 12000, minimum: 0, description: 'Contract value in USD' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  contractValueUsd?: number;

  @ApiPropertyOptional({ example: '2026-03-15', description: 'Date contract was signed' })
  @IsOptional()
  @IsDateString()
  contractSignedDate?: string;

  @ApiPropertyOptional({ example: 1.15, minimum: 1, description: 'Risk coefficient multiplier (e.g. 1.15 = 15% buffer)' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  riskCoefficient?: number;

  @ApiPropertyOptional({ example: 'Fixed-price contract with milestone payments' })
  @IsOptional()
  @IsString()
  notes?: string;
}
