import { IsObject } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdatePreferencesDto {
  @ApiProperty({ example: { theme: 'dark', language: 'en' } })
  @IsObject()
  preferences: Record<string, any>;
}
