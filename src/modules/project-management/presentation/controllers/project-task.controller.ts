import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiOkResponse,
  ApiUnauthorizedResponse,
  ApiNotFoundResponse,
  ApiExtraModels,
  getSchemaPath,
} from '@nestjs/swagger';
import { TaskService } from '../../application/services/task.service';
import { TaskFilterDto } from '../../application/dtos/task-filter.dto';
import { TaskResponseDto } from '../../application/dtos/task-response.dto';
import { JwtAuthGuard } from '../../../identity/infrastructure/guards/jwt-auth.guard';
import { RolesGuard } from '../../../identity/infrastructure/guards/roles.guard';
import { PaginationMetaResponseDto } from '../../../../shared/application/dtos/pagination-meta-response.dto';

@ApiTags('Project Tasks')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('projects/:projectId/tasks')
@ApiUnauthorizedResponse({ description: 'Unauthorized' })
@ApiExtraModels(TaskResponseDto, PaginationMetaResponseDto)
export class ProjectTaskController {
  constructor(private readonly taskService: TaskService) {}

  @Get()
  @ApiOperation({ summary: 'Get tasks for a project (depth=0 top-level only, depth=N includes N levels of subtasks)' })
  @ApiOkResponse({
    schema: {
      properties: {
        items: { type: 'array', items: { $ref: getSchemaPath(TaskResponseDto) } },
        meta: { $ref: getSchemaPath(PaginationMetaResponseDto) },
      },
    },
  })
  @ApiNotFoundResponse({ description: 'Project not found' })
  async findByProject(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Query() filterDto: TaskFilterDto,
  ) {
    return this.taskService.findByProject(projectId, filterDto);
  }

  @Get('tree')
  @ApiOperation({ summary: 'Get full task tree for a project' })
  @ApiOkResponse({ type: [TaskResponseDto], description: 'Nested task tree; children are embedded in each task' })
  async getTree(
    @Param('projectId', ParseUUIDPipe) projectId: string,
  ) {
    return this.taskService.findProjectTree(projectId);
  }
}
