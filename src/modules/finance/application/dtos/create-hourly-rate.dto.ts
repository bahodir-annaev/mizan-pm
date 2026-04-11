import { IsDateString, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class CreateHourlyRateDto {
  @IsUUID()
  userId: string;

  @IsDateString()
  effectiveDate: string;

  @IsNumber()
  @Min(0)
  salaryUzs: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  bonusUzs?: number;

  /** If omitted, auto-computed as salary × 0.12 */
  @IsOptional()
  @IsNumber()
  @Min(0)
  taxUzs?: number;

  /** If omitted, auto-computed as salary × 0.12 */
  @IsOptional()
  @IsNumber()
  @Min(0)
  jssmUzs?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  adminShareUzs?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  equipmentShareUzs?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  overheadShareUzs?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  workingHoursPerMonth?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
