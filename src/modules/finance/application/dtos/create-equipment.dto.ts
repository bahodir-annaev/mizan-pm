import { IsDateString, IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateEquipmentDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsDateString()
  purchaseDate: string;

  @IsNumber()
  @Min(0)
  purchaseCostUzs: number;

  @IsInt()
  @Min(1)
  usefulLifeMonths: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  residualValueUzs?: number;

  @IsOptional()
  @IsString()
  serialNumber?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
