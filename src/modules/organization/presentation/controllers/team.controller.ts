import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { TeamService } from '../../application/services/team.service';
import { CreateTeamDto } from '../../application/dtos/create-team.dto';
import { UpdateTeamDto } from '../../application/dtos/update-team.dto';
import { AddTeamMemberDto } from '../../application/dtos/add-team-member.dto';
import { UpdateTeamMemberRoleDto } from '../../application/dtos/update-team-member-role.dto';
import { JwtAuthGuard } from '../../../identity/infrastructure/guards/jwt-auth.guard';
import { RolesGuard } from '../../../identity/infrastructure/guards/roles.guard';
import { Roles } from '../../../identity/infrastructure/decorators/roles.decorator';
import { CurrentUser } from '../../../identity/infrastructure/decorators/current-user.decorator';
import { PaginationQueryDto } from '../../../../shared/application/pagination.dto';

@ApiTags('Teams')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('teams')
export class TeamController {
  constructor(private readonly teamService: TeamService) {}

  @Post()
  @Roles('admin')
  @ApiOperation({ summary: 'Create a new team' })
  async create(
    @Body() dto: CreateTeamDto,
    @CurrentUser() user: { id: string; roles: string[] },
  ) {
    return this.teamService.create(dto, user);
  }

  @Get()
  @ApiOperation({ summary: 'List teams (filtered by membership for non-admins)' })
  async findAll(
    @Query() query: PaginationQueryDto,
    @CurrentUser() user: { id: string; roles: string[] },
  ) {
    return this.teamService.findAll(query, user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get team details' })
  async findById(@Param('id', ParseUUIDPipe) id: string) {
    return this.teamService.findById(id);
  }

  @Patch(':id')
  @Roles('manager')
  @ApiOperation({ summary: 'Update team info (manager+ or admin)' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTeamDto,
    @CurrentUser() user: { id: string; roles: string[] },
  ) {
    return this.teamService.update(id, dto, user);
  }

  @Delete(':id')
  @Roles('admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft delete team (admin only)' })
  async delete(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: { id: string; roles: string[] },
  ) {
    await this.teamService.softDelete(id, user);
  }

  // --- Membership endpoints ---

  @Get(':id/members')
  @ApiOperation({ summary: 'List team members' })
  async getMembers(@Param('id', ParseUUIDPipe) id: string) {
    return this.teamService.getMembers(id);
  }

  @Post(':id/members')
  @Roles('manager')
  @ApiOperation({ summary: 'Add member to team (manager+ or admin)' })
  async addMember(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddTeamMemberDto,
    @CurrentUser() user: { id: string; roles: string[] },
  ) {
    return this.teamService.addMember(id, dto, user);
  }

  @Patch(':id/members/:userId')
  @Roles('manager')
  @ApiOperation({ summary: 'Update member role in team (manager+ or admin)' })
  async updateMemberRole(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() dto: UpdateTeamMemberRoleDto,
    @CurrentUser() user: { id: string; roles: string[] },
  ) {
    return this.teamService.updateMemberRole(id, userId, dto, user);
  }

  @Delete(':id/members/:userId')
  @Roles('manager')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove member from team (manager+ or admin)' })
  async removeMember(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('userId', ParseUUIDPipe) userId: string,
    @CurrentUser() user: { id: string; roles: string[] },
  ) {
    await this.teamService.removeMember(id, userId, user);
  }
}
