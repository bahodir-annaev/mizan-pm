import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ActivityLogResponseDto {
  @ApiProperty({ example: 'log-uuid', format: 'uuid' })
  id: string;

  @ApiPropertyOptional({ example: 'org-uuid', format: 'uuid', nullable: true })
  orgId: string | null;

  @ApiProperty({ example: 'user-uuid', format: 'uuid', description: 'User who performed the action' })
  actorId: string;

  @ApiProperty({ example: 'task.status_changed', description: 'Action type key' })
  action: string;

  @ApiProperty({ example: 'task', description: 'Type of entity that was modified' })
  entityType: string;

  @ApiProperty({ example: 'task-uuid', format: 'uuid' })
  entityId: string;

  @ApiPropertyOptional({ example: { from: 'PLANNING', to: 'IN_PROGRESS' }, nullable: true, description: 'Action-specific metadata' })
  metadata: Record<string, any> | null;

  @ApiProperty({ example: '2026-04-11T10:30:00Z' })
  createdAt: Date;
}
