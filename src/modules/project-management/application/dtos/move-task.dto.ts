import { IsOptional, IsUUID, IsInt, Min, ValidateIf } from 'class-validator';

export class MoveTaskDto {
  @ValidateIf((o) => o.parentId !== null)
  @IsUUID()
  @IsOptional()
  parentId?: string | null;

  @IsInt()
  @Min(0)
  @IsOptional()
  position?: number;
}
