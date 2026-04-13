import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ContactPersonResponseDto {
  @ApiProperty({ example: 'contact-uuid', format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'Jane Smith' })
  name: string;

  @ApiPropertyOptional({ example: 'Project Manager', nullable: true })
  position: string | null;

  @ApiPropertyOptional({ example: 'jane@company.com', nullable: true })
  email: string | null;

  @ApiPropertyOptional({ example: '+998901234567', nullable: true })
  phone: string | null;

  @ApiProperty({ example: '2026-01-01T00:00:00Z' })
  createdAt: Date;
}

export class ClientResponseDto {
  @ApiProperty({ example: 'client-uuid', format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'Acme Corporation' })
  name: string;

  @ApiProperty({ example: 'COMPANY', description: 'INDIVIDUAL | COMPANY' })
  clientType: string;

  @ApiPropertyOptional({ example: 'info@acme.com', nullable: true })
  email: string | null;

  @ApiPropertyOptional({ example: '+998711234567', nullable: true })
  phone: string | null;

  @ApiPropertyOptional({ example: '123 Main St, Tashkent', nullable: true })
  address: string | null;

  @ApiPropertyOptional({ example: 'https://acme.com', nullable: true })
  website: string | null;

  @ApiPropertyOptional({ example: 'VIP client since 2020', nullable: true })
  notes: string | null;

  @ApiProperty({ example: false })
  isFavorite: boolean;

  @ApiPropertyOptional({ example: 'Commercial', nullable: true, description: 'Client group label' })
  group: string | null;

  @ApiPropertyOptional({ type: [ContactPersonResponseDto] })
  contacts?: ContactPersonResponseDto[];

  @ApiPropertyOptional({ example: 3, description: 'Number of associated projects' })
  projectCount?: number;

  @ApiProperty({ example: '2026-01-01T00:00:00Z' })
  createdAt: Date;

  @ApiProperty({ example: '2026-04-11T10:30:00Z' })
  updatedAt: Date;
}
