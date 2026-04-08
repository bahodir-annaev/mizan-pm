import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { TaskService } from '../../application/services/task.service';
import { CreateTaskDto } from '../../application/dtos/create-task.dto';
import { UpdateTaskDto } from '../../application/dtos/update-task.dto';
import { MoveTaskDto } from '../../application/dtos/move-task.dto';
import { AssignTaskDto } from '../../application/dtos/assign-task.dto';
import { TaskFilterDto } from '../../application/dtos/task-filter.dto';
import { JwtAuthGuard } from '../../../identity/infrastructure/guards/jwt-auth.guard';
import { RolesGuard } from '../../../identity/infrastructure/guards/roles.guard';
import { Roles } from '../../../identity/infrastructure/decorators/roles.decorator';
import { CurrentUser } from '../../../identity/infrastructure/decorators/current-user.decorator';

@ApiTags('Tasks')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('tasks')
export class TaskController {
  constructor(private readonly taskService: TaskService) {}

  @Get()
  @ApiOperation({ summary: 'List tasks created by or assigned to the current user (optionally scoped to a project)' })
  async findForUser(
    @Query() filterDto: TaskFilterDto,
    @CurrentUser() user: { id: string; roles: string[] },
  ) {
    return this.taskService.findForUser(user, filterDto);
  }

  @Post()
  @Roles('member')
  @ApiOperation({ summary: 'Create a task (top-level or sub-task)' })
  async create(
    @Body() dto: CreateTaskDto,
    @CurrentUser() user: { id: string; roles: string[] },
  ) {
    return this.taskService.create(dto, user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get task details with assignees' })
  async findById(@Param('id', ParseUUIDPipe) id: string) {
    return this.taskService.findById(id);
  }

  @Patch(':id')
  @Roles('member')
  @ApiOperation({ summary: 'Update task details or status' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTaskDto,
    @CurrentUser() user: { id: string; roles: string[] },
  ) {
    return this.taskService.update(id, dto, user);
  }

  @Delete(':id')
  @Roles('manager')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft delete task (cascades to children)' })
  async delete(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: { id: string; roles: string[] },
  ) {
    await this.taskService.softDelete(id, user);
  }

  @Get(':id/children')
  @ApiOperation({ summary: 'Get direct children of a task' })
  async getChildren(@Param('id', ParseUUIDPipe) id: string) {
    return this.taskService.findChildren(id);
  }

  @Get(':id/subtree')
  @ApiOperation({ summary: 'Get full subtree below a task' })
  async getSubtree(@Param('id', ParseUUIDPipe) id: string) {
    return this.taskService.findSubtree(id);
  }

  @Patch(':id/move')
  @Roles('member')
  @ApiOperation({ summary: 'Move task to new parent or reorder among siblings' })
  async move(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: MoveTaskDto,
    @CurrentUser() user: { id: string; roles: string[] },
  ) {
    return this.taskService.moveTask(id, dto, user);
  }

  @Get(':id/assignees')
  @ApiOperation({ summary: 'List task assignees' })
  async getAssignees(@Param('id', ParseUUIDPipe) id: string) {
    return this.taskService.getAssignees(id);
  }

  @Post(':id/assignees')
  @Roles('manager')
  @ApiOperation({ summary: 'Assign user(s) to task (manager+ required)' })
  async assign(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AssignTaskDto,
    @CurrentUser() user: { id: string; roles: string[] },
  ) {
    return this.taskService.assignUsers(id, dto, user);
  }

  @Delete(':id/assignees/:userId')
  @Roles('manager')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Unassign user from task (manager+ required)' })
  async unassign(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('userId', ParseUUIDPipe) userId: string,
    @CurrentUser() user: { id: string; roles: string[] },
  ) {
    await this.taskService.unassignUser(id, userId, user);
  }
}
