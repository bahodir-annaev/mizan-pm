import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { TeamRole } from '../../domain/entities/team-role.enum';

export class UpdateTeamMemberRoleDto {
  @ApiProperty({ enum: TeamRole })
  @IsEnum(TeamRole)
  teamRole: TeamRole;
}
