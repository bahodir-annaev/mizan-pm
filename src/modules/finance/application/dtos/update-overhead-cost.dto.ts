import { IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateOverheadCostDto {
  @ApiPropertyOptional({ example: 3800000, minimum: 0, description: 'Updated amount in UZS' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  amountUzs?: number;

  @ApiPropertyOptional({ example: 'Updated office rent including utilities' })
  @IsOptional()
  @IsString()
  description?: string;
}
