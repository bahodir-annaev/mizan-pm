import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OverheadCategory } from '../../domain/entities/overhead-category.enum';

export class OverheadCostResponseDto {
  @ApiProperty({ example: 'cost-uuid', format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'org-uuid', format: 'uuid' })
  orgId: string;

  @ApiProperty({ example: 2026 })
  periodYear: number;

  @ApiProperty({ example: 4 })
  periodMonth: number;

  @ApiProperty({ enum: OverheadCategory, example: OverheadCategory.RENT })
  category: OverheadCategory;

  @ApiProperty({ example: 3500000, description: 'Amount in UZS' })
  amountUzs: number;

  @ApiPropertyOptional({ example: 'Monthly office rent', nullable: true })
  description: string | null;

  @ApiProperty({ example: '2026-04-01T00:00:00Z' })
  createdAt: Date;
}
