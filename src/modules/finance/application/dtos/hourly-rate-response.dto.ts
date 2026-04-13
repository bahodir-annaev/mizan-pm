import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class HourlyRateResponseDto {
  @ApiProperty({ example: 'rate-uuid', format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'user-uuid', format: 'uuid' })
  userId: string;

  @ApiPropertyOptional({ example: 'org-uuid', format: 'uuid', nullable: true })
  orgId: string | null;

  @ApiProperty({ example: '2026-04-01', description: 'Date from which this rate is effective' })
  effectiveDate: string;

  @ApiProperty({ example: 5000000, description: 'Monthly salary in UZS' })
  salaryUzs: number;

  @ApiProperty({ example: 500000, description: 'Monthly bonus in UZS' })
  bonusUzs: number;

  @ApiProperty({ example: 600000, description: 'Income tax (auto-computed if not provided)' })
  taxUzs: number;

  @ApiProperty({ example: 600000, description: 'JSSM social contribution (auto-computed if not provided)' })
  jssmUzs: number;

  @ApiProperty({ example: 200000 })
  adminShareUzs: number;

  @ApiProperty({ example: 150000 })
  equipmentShareUzs: number;

  @ApiProperty({ example: 100000 })
  overheadShareUzs: number;

  @ApiProperty({ example: 7150000, description: 'Total monthly employer cost in UZS' })
  totalMonthlyCostUzs: number;

  @ApiProperty({ example: 40625.0, description: 'Hourly rate in UZS (totalMonthlyCostUzs / workingHours)' })
  hourlyRateUzs: number;

  @ApiPropertyOptional({ example: 3.19, nullable: true, description: 'Hourly rate in USD (computed using exchange rate)' })
  hourlyRateUsd: number | null;

  @ApiProperty({ example: 176, description: 'Working hours per month used for calculation' })
  workingHoursPerMonth: number;

  @ApiPropertyOptional({ example: 'Promotion Q2 2026', nullable: true })
  notes: string | null;

  @ApiProperty({ example: '2026-04-01T00:00:00Z' })
  createdAt: Date;
}
