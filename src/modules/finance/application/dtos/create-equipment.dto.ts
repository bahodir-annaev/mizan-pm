import { IsDateString, IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateEquipmentDto {
  @ApiProperty({ example: 'MacBook Pro 16"' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: 'Laptop', description: 'Equipment category label' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiProperty({ example: '2026-01-15', description: 'Date of purchase' })
  @IsDateString()
  purchaseDate: string;

  @ApiProperty({ example: 25000000, minimum: 0, description: 'Purchase cost in UZS' })
  @IsNumber()
  @Min(0)
  purchaseCostUzs: number;

  @ApiProperty({ example: 36, minimum: 1, description: 'Useful life in months for amortization' })
  @IsInt()
  @Min(1)
  usefulLifeMonths: number;

  @ApiPropertyOptional({ example: 2500000, minimum: 0, description: 'Residual value in UZS after useful life' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  residualValueUzs?: number;

  @ApiPropertyOptional({ example: 'SN-ABC123456' })
  @IsOptional()
  @IsString()
  serialNumber?: string;

  @ApiPropertyOptional({ example: 'Assigned to design team' })
  @IsOptional()
  @IsString()
  notes?: string;
}
