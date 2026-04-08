import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { TaskService } from '../../application/services/task.service';
import { TaskFilterDto } from '../../application/dtos/task-filter.dto';
import { JwtAuthGuard } from '../../../identity/infrastructure/guards/jwt-auth.guard';
import { RolesGuard } from '../../../identity/infrastructure/guards/roles.guard';

@ApiTags('Project Tasks')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('projects/:projectId/tasks')
export class ProjectTaskController {
  constructor(private readonly taskService: TaskService) {}

  @Get()
  @ApiOperation({ summary: 'Get tasks for a project (depth=0 top-level only, depth=N includes N levels of subtasks)' })
  async findByProject(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Query() filterDto: TaskFilterDto,
  ) {
    return this.taskService.findByProject(projectId, filterDto);
  }

  @Get('tree')
  @ApiOperation({ summary: 'Get full task tree for a project' })
  async getTree(
    @Param('projectId', ParseUUIDPipe) projectId: string,
  ) {
    return this.taskService.findProjectTree(projectId);
  }
}
