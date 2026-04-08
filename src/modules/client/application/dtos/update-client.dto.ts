import {
  IsString,
  IsOptional,
  IsEnum,
  IsEmail,
  IsBoolean,
  IsUUID,
  IsUrl,
  MaxLength,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { ClientType } from '../../domain/entities/client-type.enum';

export class UpdateClientDto {
  @ApiPropertyOptional({ description: 'Organization ID' })
  @IsUUID()
  @IsOptional()
  orgId?: string;

  @ApiPropertyOptional({ maxLength: 200 })
  @IsString()
  @IsOptional()
  @MaxLength(200)
  name?: string;

  @ApiPropertyOptional({ enum: ClientType })
  @IsEnum(ClientType)
  @IsOptional()
  clientType?: ClientType;

  @ApiPropertyOptional()
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  @MaxLength(50)
  phone?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  @MaxLength(500)
  address?: string;

  @ApiPropertyOptional()
  @IsUrl()
  @IsOptional()
  website?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isFavorite?: boolean;

  @ApiPropertyOptional({ description: 'Client grouping label' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  group?: string;
}
