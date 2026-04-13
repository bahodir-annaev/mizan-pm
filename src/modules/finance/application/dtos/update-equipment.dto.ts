import { IsBoolean, IsDateString, IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateEquipmentDto {
  @ApiPropertyOptional({ example: 'MacBook Pro 16" (2026)' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: 'Laptop' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ example: 'SN-XYZ789' })
  @IsOptional()
  @IsString()
  serialNumber?: string;

  @ApiPropertyOptional({ example: false, description: 'Set to false to decommission the equipment' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ example: '2029-01-01', description: 'Date when equipment was decommissioned' })
  @IsOptional()
  @IsDateString()
  decommissionDate?: string;

  @ApiPropertyOptional({ example: 'Transferred to archive storage' })
  @IsOptional()
  @IsString()
  notes?: string;
}
