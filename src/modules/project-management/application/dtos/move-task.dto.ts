import { IsOptional, IsUUID, IsInt, Min, ValidateIf } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class MoveTaskDto {
  @ApiPropertyOptional({ format: 'uuid', nullable: true, description: 'New parent task ID; set to null to make a top-level task' })
  @ValidateIf((o) => o.parentId !== null)
  @IsUUID()
  @IsOptional()
  parentId?: string | null;

  @ApiPropertyOptional({ example: 2, minimum: 0, description: 'Zero-based position among siblings' })
  @IsInt()
  @Min(0)
  @IsOptional()
  position?: number;
}
