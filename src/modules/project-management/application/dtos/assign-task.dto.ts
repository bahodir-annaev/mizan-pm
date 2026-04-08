import { IsUUID, IsArray, ArrayMinSize } from 'class-validator';

export class AssignTaskDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  userIds: string[];
}
