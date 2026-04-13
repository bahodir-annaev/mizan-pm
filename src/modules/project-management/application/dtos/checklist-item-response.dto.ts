import { ApiProperty } from '@nestjs/swagger';

export class ChecklistItemResponseDto {
  @ApiProperty({ example: 'item-uuid', format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'task-uuid', format: 'uuid' })
  taskId: string;

  @ApiProperty({ example: 'Review structural drawings' })
  title: string;

  @ApiProperty({ example: false })
  isCompleted: boolean;

  @ApiProperty({ example: 0, description: 'Sort order within the checklist' })
  sortOrder: number;

  @ApiProperty({ example: '2026-04-01T00:00:00Z' })
  createdAt: Date;

  @ApiProperty({ example: '2026-04-11T10:30:00Z' })
  updatedAt: Date;
}
