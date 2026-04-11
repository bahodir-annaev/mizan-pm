import { IsDateString, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateProjectFinancialPlanDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  contractValueUzs?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  contractValueUsd?: number;

  @IsOptional()
  @IsDateString()
  contractSignedDate?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  riskCoefficient?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
