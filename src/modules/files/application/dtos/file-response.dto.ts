import { ApiProperty } from '@nestjs/swagger';

export class FileResponseDto {
  @ApiProperty({ example: 'file-uuid', format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'project', description: 'Entity type this file is attached to: project | client' })
  entityType: string;

  @ApiProperty({ example: 'project-uuid', format: 'uuid' })
  entityId: string;

  @ApiProperty({ example: 'floor-plan-v3.pdf' })
  originalName: string;

  @ApiProperty({ example: 'application/pdf' })
  mimeType: string;

  @ApiProperty({ example: 2048576, description: 'File size in bytes' })
  size: number;

  @ApiProperty({ example: 'user-uuid', format: 'uuid', description: 'User who uploaded the file' })
  uploadedBy: string;

  @ApiProperty({ example: '2026-04-11T09:00:00Z' })
  createdAt: Date;
}
