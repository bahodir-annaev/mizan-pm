import { IsBoolean, IsDateString, IsOptional, IsString } from 'class-validator';

export class UpdateEquipmentDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  serialNumber?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsDateString()
  decommissionDate?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
