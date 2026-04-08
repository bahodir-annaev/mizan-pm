import { IsString, IsNotEmpty, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateCommentDto {
  @ApiProperty({ description: 'Updated comment content' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(10000)
  content: string;
}
