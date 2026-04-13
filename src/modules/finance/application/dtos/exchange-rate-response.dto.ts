import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ExchangeRateResponseDto {
  @ApiProperty({ example: 'rate-uuid', format: 'uuid' })
  id: string;

  @ApiPropertyOptional({ example: 'org-uuid', format: 'uuid', nullable: true })
  orgId: string | null;

  @ApiProperty({ example: '2026-04-01', description: 'Date this rate applies to' })
  rateDate: string;

  @ApiProperty({ example: 12750.5, description: 'UZS per 1 USD' })
  uzsPerUsd: number;

  @ApiPropertyOptional({ example: 'CBU', nullable: true })
  source: string | null;

  @ApiProperty({ example: '2026-04-01T08:00:00Z' })
  createdAt: Date;

  @ApiProperty({ example: '2026-04-01T08:00:00Z' })
  updatedAt: Date;
}
