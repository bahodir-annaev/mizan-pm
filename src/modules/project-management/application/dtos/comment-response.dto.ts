import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CommentAuthorDto {
  @ApiProperty({ example: 'user-uuid', format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'John Doe' })
  name: string;

  @ApiPropertyOptional({ example: 'https://example.com/avatar.png', nullable: true })
  avatarUrl: string | null;
}

export class CommentResponseDto {
  @ApiProperty({ example: 'comment-uuid', format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'task-uuid', format: 'uuid' })
  taskId: string;

  @ApiProperty({ example: 'user-uuid', format: 'uuid' })
  userId: string;

  @ApiProperty({ example: 'Looks good, but please check the dimensions on section B.' })
  content: string;

  @ApiProperty({ type: CommentAuthorDto })
  user: CommentAuthorDto;

  @ApiProperty({ example: '2026-04-10T14:20:00Z' })
  createdAt: Date;

  @ApiProperty({ example: '2026-04-10T14:20:00Z' })
  updatedAt: Date;
}
