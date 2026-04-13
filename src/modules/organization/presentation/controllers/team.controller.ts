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
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiNoContentResponse,
  ApiUnauthorizedResponse,
  ApiNotFoundResponse,
  ApiForbiddenResponse,
  ApiExtraModels,
  getSchemaPath,
} from '@nestjs/swagger';
import { TeamService } from '../../application/services/team.service';
import { CreateTeamDto } from '../../application/dtos/create-team.dto';
import { UpdateTeamDto } from '../../application/dtos/update-team.dto';
import { AddTeamMemberDto } from '../../application/dtos/add-team-member.dto';
import { UpdateTeamMemberRoleDto } from '../../application/dtos/update-team-member-role.dto';
import { TeamResponseDto, TeamMemberResponseDto } from '../../application/dtos/team-response.dto';
import { JwtAuthGuard } from '../../../identity/infrastructure/guards/jwt-auth.guard';
import { RolesGuard } from '../../../identity/infrastructure/guards/roles.guard';
import { Roles } from '../../../identity/infrastructure/decorators/roles.decorator';
import { CurrentUser } from '../../../identity/infrastructure/decorators/current-user.decorator';
import { PaginationQueryDto } from '../../../../shared/application/pagination.dto';
import { PaginationMetaResponseDto } from '../../../../shared/application/dtos/pagination-meta-response.dto';

@ApiTags('Teams')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('teams')
@ApiUnauthorizedResponse({ description: 'Unauthorized' })
@ApiExtraModels(TeamResponseDto, TeamMemberResponseDto, PaginationMetaResponseDto)
export class TeamController {
  constructor(private readonly teamService: TeamService) {}

  @Post()
  @Roles('admin')
  @ApiOperation({ summary: 'Create a new team' })
  @ApiCreatedResponse({ type: TeamResponseDto })
  @ApiForbiddenResponse({ description: 'Insufficient role' })
  async create(
    @Body() dto: CreateTeamDto,
    @CurrentUser() user: { id: string; roles: string[] },
  ) {
    return this.teamService.create(dto, user);
  }

  @Get()
  @ApiOperation({ summary: 'List teams (filtered by membership for non-admins)' })
  @ApiOkResponse({
    schema: {
      properties: {
        items: { type: 'array', items: { $ref: getSchemaPath(TeamResponseDto) } },
        meta: { $ref: getSchemaPath(PaginationMetaResponseDto) },
      },
    },
  })
  async findAll(
    @Query() query: PaginationQueryDto,
    @CurrentUser() user: { id: string; roles: string[] },
  ) {
    return this.teamService.findAll(query, user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get team details' })
  @ApiOkResponse({ type: TeamResponseDto })
  @ApiNotFoundResponse({ description: 'Team not found' })
  async findById(@Param('id', ParseUUIDPipe) id: string) {
    return this.teamService.findById(id);
  }

  @Patch(':id')
  @Roles('manager')
  @ApiOperation({ summary: 'Update team info (manager+ or admin)' })
  @ApiOkResponse({ type: TeamResponseDto })
  @ApiForbiddenResponse({ description: 'Insufficient role' })
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
  @ApiNoContentResponse()
  @ApiForbiddenResponse({ description: 'Insufficient role' })
  async delete(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: { id: string; roles: string[] },
  ) {
    await this.teamService.softDelete(id, user);
  }

  @Get(':id/members')
  @ApiOperation({ summary: 'List team members' })
  @ApiOkResponse({ type: [TeamMemberResponseDto] })
  async getMembers(@Param('id', ParseUUIDPipe) id: string) {
    return this.teamService.getMembers(id);
  }

  @Post(':id/members')
  @Roles('manager')
  @ApiOperation({ summary: 'Add member to team (manager+ or admin)' })
  @ApiCreatedResponse({ type: TeamMemberResponseDto })
  @ApiForbiddenResponse({ description: 'Insufficient role' })
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
  @ApiOkResponse({ type: TeamMemberResponseDto })
  @ApiForbiddenResponse({ description: 'Insufficient role' })
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
  @ApiNoContentResponse()
  @ApiForbiddenResponse({ description: 'Insufficient role' })
  async removeMember(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('userId', ParseUUIDPipe) userId: string,
    @CurrentUser() user: { id: string; roles: string[] },
  ) {
    await this.teamService.removeMember(id, userId, user);
  }
}
