import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class EquipmentResponseDto {
  @ApiProperty({ example: 'equip-uuid', format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'org-uuid', format: 'uuid' })
  orgId: string;

  @ApiProperty({ example: 'MacBook Pro 16"' })
  name: string;

  @ApiPropertyOptional({ example: 'Laptop', nullable: true })
  category: string | null;

  @ApiProperty({ example: '2026-01-15' })
  purchaseDate: string;

  @ApiProperty({ example: 25000000, description: 'Purchase cost in UZS' })
  purchaseCostUzs: number;

  @ApiProperty({ example: 36, description: 'Useful life in months' })
  usefulLifeMonths: number;

  @ApiProperty({ example: 680555.56, description: 'Auto-computed monthly amortization in UZS' })
  monthlyAmortizationUzs: number;

  @ApiProperty({ example: 2500000, description: 'Residual value in UZS' })
  residualValueUzs: number;

  @ApiProperty({ example: true })
  isActive: boolean;

  @ApiPropertyOptional({ example: '2029-01-15', nullable: true, description: 'Date decommissioned (if isActive=false)' })
  decommissionDate: string | null;

  @ApiPropertyOptional({ example: 'SN-ABC123', nullable: true })
  serialNumber: string | null;

  @ApiPropertyOptional({ example: 'Assigned to design team', nullable: true })
  notes: string | null;

  @ApiProperty({ example: '2026-01-15T00:00:00Z' })
  createdAt: Date;
}
