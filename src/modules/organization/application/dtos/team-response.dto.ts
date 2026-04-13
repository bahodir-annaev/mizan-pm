import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class TeamResponseDto {
  @ApiProperty({ example: 'team-uuid', format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'Design Team' })
  name: string;

  @ApiPropertyOptional({ example: 'DT', nullable: true, description: 'Short team code' })
  code: string | null;

  @ApiPropertyOptional({ example: 'Responsible for all interior and exterior designs', nullable: true })
  description: string | null;

  @ApiProperty({ example: 'user-uuid', format: 'uuid' })
  createdBy: string;

  @ApiProperty({ example: '2026-01-01T00:00:00Z' })
  createdAt: Date;

  @ApiProperty({ example: '2026-04-11T10:30:00Z' })
  updatedAt: Date;
}

export class TeamMemberResponseDto {
  @ApiProperty({ example: 'membership-uuid', format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'team-uuid', format: 'uuid' })
  teamId: string;

  @ApiProperty({ example: 'user-uuid', format: 'uuid' })
  userId: string;

  @ApiProperty({ example: 'member', description: 'member | lead | manager' })
  role: string;

  @ApiProperty({ example: '2026-01-15T00:00:00Z' })
  joinedAt: Date;
}
