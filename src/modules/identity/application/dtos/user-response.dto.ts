import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UserResponseDto {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'john.doe@example.com' })
  email: string;

  @ApiProperty({ example: 'John' })
  firstName: string;

  @ApiProperty({ example: 'Doe' })
  lastName: string;

  @ApiProperty({ example: 'John Doe' })
  name: string;

  @ApiPropertyOptional({ example: 'https://example.com/avatars/john.png', nullable: true })
  avatarUrl: string | null;

  @ApiPropertyOptional({ example: '+998901234567', nullable: true })
  phone: string | null;

  @ApiPropertyOptional({ example: 'Lead Architect', nullable: true })
  position: string | null;

  @ApiPropertyOptional({ example: 'Design', nullable: true })
  department: string | null;

  @ApiProperty({ example: 'ACTIVE', description: 'ACTIVE | INACTIVE | ON_LEAVE' })
  status: string;

  @ApiProperty({ example: 'manager', description: 'Computed primary role: admin | manager | member' })
  primaryRole: string;

  @ApiProperty({ type: 'array', items: { type: 'object', properties: { id: { type: 'string' }, name: { type: 'string' } } }, example: [{ id: 'uuid', name: 'manager' }] })
  roles: { id: string; name: string }[];

  @ApiPropertyOptional({ example: 'org-uuid', format: 'uuid', nullable: true })
  orgId: string | null;

  @ApiProperty({ example: true })
  isActive: boolean;

  @ApiPropertyOptional({ example: '2026-01-15', nullable: true })
  joinDate: string | null;

  @ApiProperty({ example: '2026-04-11T10:30:00Z' })
  createdAt: Date;

  @ApiProperty({ example: '2026-04-11T10:30:00Z' })
  updatedAt: Date;
}
