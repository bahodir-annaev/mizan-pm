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
  ApiBody,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiNoContentResponse,
  ApiUnauthorizedResponse,
  ApiNotFoundResponse,
  ApiForbiddenResponse,
  ApiExtraModels,
  getSchemaPath,
} from '@nestjs/swagger';
import { ProjectService } from '../../application/services/project.service';
import { CreateProjectDto } from '../../application/dtos/create-project.dto';
import { UpdateProjectDto } from '../../application/dtos/update-project.dto';
import { ProjectFilterDto } from '../../application/dtos/project-filter.dto';
import { ProjectResponseDto, ProjectMemberResponseDto } from '../../application/dtos/project-response.dto';
import { JwtAuthGuard } from '../../../identity/infrastructure/guards/jwt-auth.guard';
import { RolesGuard } from '../../../identity/infrastructure/guards/roles.guard';
import { Roles } from '../../../identity/infrastructure/decorators/roles.decorator';
import { CurrentUser } from '../../../identity/infrastructure/decorators/current-user.decorator';
import { PaginationMetaResponseDto } from '../../../../shared/application/dtos/pagination-meta-response.dto';

@ApiTags('Projects')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('projects')
@ApiUnauthorizedResponse({ description: 'Unauthorized' })
@ApiExtraModels(ProjectResponseDto, ProjectMemberResponseDto, PaginationMetaResponseDto)
export class ProjectController {
  constructor(private readonly projectService: ProjectService) {}

  @Post()
  @Roles('manager')
  @ApiOperation({ summary: 'Create project (manager+ or admin)' })
  @ApiCreatedResponse({ type: ProjectResponseDto })
  @ApiForbiddenResponse({ description: 'Insufficient role' })
  async create(
    @Body() dto: CreateProjectDto,
    @CurrentUser() user: any,
  ) {
    return this.projectService.create(dto, user);
  }

  @Get()
  @ApiOperation({ summary: 'List projects with filters (scoped by team access)' })
  @ApiOkResponse({
    schema: {
      properties: {
        items: { type: 'array', items: { $ref: getSchemaPath(ProjectResponseDto) } },
        meta: { $ref: getSchemaPath(PaginationMetaResponseDto) },
      },
    },
  })
  async findAll(
    @Query() query: ProjectFilterDto,
    @CurrentUser() user: any,
  ) {
    return this.projectService.findAll(query, user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get project details' })
  @ApiOkResponse({ type: ProjectResponseDto })
  @ApiNotFoundResponse({ description: 'Project not found' })
  async findById(@Param('id', ParseUUIDPipe) id: string) {
    return this.projectService.findById(id);
  }

  @Patch(':id')
  @Roles('manager')
  @ApiOperation({ summary: 'Update project (manager+ or admin)' })
  @ApiOkResponse({ type: ProjectResponseDto })
  @ApiForbiddenResponse({ description: 'Insufficient role' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProjectDto,
    @CurrentUser() user: any,
  ) {
    return this.projectService.update(id, dto, user);
  }

  @Patch(':id/pin')
  @ApiOperation({ summary: 'Toggle project pin status' })
  @ApiOkResponse({ type: ProjectResponseDto })
  async togglePin(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
  ) {
    return this.projectService.togglePin(id, user);
  }

  @Delete(':id')
  @Roles('manager')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Archive project (manager+ or admin)' })
  @ApiNoContentResponse()
  @ApiForbiddenResponse({ description: 'Insufficient role' })
  async delete(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
  ) {
    await this.projectService.softDelete(id, user);
  }

  @Get(':id/members')
  @ApiOperation({ summary: 'List project members' })
  @ApiOkResponse({ type: [ProjectMemberResponseDto] })
  async getMembers(@Param('id', ParseUUIDPipe) id: string) {
    return this.projectService.getMembers(id);
  }

  @Post(':id/members')
  @Roles('manager')
  @ApiOperation({ summary: 'Add member to project' })
  @ApiBody({ schema: { type: 'object', required: ['userId'], properties: { userId: { type: 'string', format: 'uuid' }, role: { type: 'string', example: 'member' } } } })
  @ApiCreatedResponse({ type: ProjectMemberResponseDto })
  @ApiForbiddenResponse({ description: 'Insufficient role' })
  async addMember(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { userId: string; role?: string },
  ) {
    return this.projectService.addMember(id, body.userId, body.role);
  }

  @Delete(':id/members/:userId')
  @Roles('manager')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove member from project' })
  @ApiNoContentResponse()
  @ApiForbiddenResponse({ description: 'Insufficient role' })
  async removeMember(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('userId', ParseUUIDPipe) userId: string,
  ) {
    await this.projectService.removeMember(id, userId);
  }
}
