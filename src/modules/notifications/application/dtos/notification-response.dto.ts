import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class NotificationResponseDto {
  @ApiProperty({ example: 'notif-uuid', format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'user-uuid', format: 'uuid' })
  userId: string;

  @ApiProperty({ example: 'task.assigned', description: 'Notification type key' })
  type: string;

  @ApiProperty({ example: 'Task assigned to you' })
  title: string;

  @ApiProperty({ example: 'You have been assigned to "Design floor plan for level 3"' })
  message: string;

  @ApiPropertyOptional({ example: 'task', nullable: true })
  entityType: string | null;

  @ApiPropertyOptional({ example: 'task-uuid', format: 'uuid', nullable: true })
  entityId: string | null;

  @ApiProperty({ example: false })
  isRead: boolean;

  @ApiProperty({ example: '2026-04-11T09:15:00Z' })
  createdAt: Date;
}
