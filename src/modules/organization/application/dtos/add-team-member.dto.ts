import { IsUUID, IsEnum, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TeamRole } from '../../domain/entities/team-role.enum';

export class AddTeamMemberDto {
  @ApiProperty()
  @IsUUID()
  userId: string;

  @ApiPropertyOptional({ enum: TeamRole, default: TeamRole.MEMBER })
  @IsEnum(TeamRole)
  @IsOptional()
  teamRole?: TeamRole = TeamRole.MEMBER;
}
