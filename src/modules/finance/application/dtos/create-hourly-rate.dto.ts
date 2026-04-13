import { IsDateString, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateHourlyRateDto {
  @ApiProperty({ format: 'uuid', description: 'User to set the rate for' })
  @IsUUID()
  userId: string;

  @ApiProperty({ example: '2026-04-01', description: 'Date from which this rate is effective' })
  @IsDateString()
  effectiveDate: string;

  @ApiProperty({ example: 5000000, minimum: 0, description: 'Monthly salary in UZS' })
  @IsNumber()
  @Min(0)
  salaryUzs: number;

  @ApiPropertyOptional({ example: 500000, minimum: 0, description: 'Monthly bonus in UZS' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  bonusUzs?: number;

  @ApiPropertyOptional({ example: 600000, minimum: 0, description: 'Income tax in UZS; if omitted, auto-computed as salary × 0.12' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  taxUzs?: number;

  @ApiPropertyOptional({ example: 600000, minimum: 0, description: 'JSSM contribution in UZS; if omitted, auto-computed as salary × 0.12' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  jssmUzs?: number;

  @ApiPropertyOptional({ example: 200000, minimum: 0, description: 'Admin overhead share in UZS' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  adminShareUzs?: number;

  @ApiPropertyOptional({ example: 150000, minimum: 0, description: 'Equipment amortization share in UZS' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  equipmentShareUzs?: number;

  @ApiPropertyOptional({ example: 100000, minimum: 0, description: 'Other overhead share in UZS' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  overheadShareUzs?: number;

  @ApiPropertyOptional({ example: 168, minimum: 1, description: 'Working hours per month (used to compute hourly rate)' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  workingHoursPerMonth?: number;

  @ApiPropertyOptional({ example: 'Promotion effective Q2 2026' })
  @IsOptional()
  @IsString()
  notes?: string;
}
