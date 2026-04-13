import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class OrganizationResponseDto {
  @ApiProperty({ example: 'org-uuid', format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'Acme Architecture' })
  name: string;

  @ApiProperty({ example: 'acme-architecture' })
  slug: string;

  @ApiPropertyOptional({ example: 'https://example.com/logo.png', nullable: true })
  logoUrl: string | null;

  @ApiPropertyOptional({ example: 1000000, nullable: true, description: 'Budget limit in base currency' })
  budgetLimit: number | null;

  @ApiPropertyOptional({ nullable: true, description: 'Arbitrary org settings JSON' })
  settings: Record<string, any> | null;

  @ApiProperty({ example: '2026-01-01T00:00:00Z' })
  createdAt: Date;

  @ApiProperty({ example: '2026-04-11T10:30:00Z' })
  updatedAt: Date;
}
