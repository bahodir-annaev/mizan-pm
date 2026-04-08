import {
  Injectable,
  Inject,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Repository } from 'typeorm';
import { Task } from '../../domain/entities/task.entity';
import { TaskAssignee } from '../../domain/entities/task-assignee.entity';
import { TaskStatus } from '../../domain/entities/task-status.enum';
import {
  ITaskRepository,
  TASK_REPOSITORY,
} from '../../domain/repositories/task-repository.interface';
import { ProjectService } from './project.service';
import { TeamService } from '../../../organization/application/services/team.service';
import { TeamMembership } from '../../../organization/domain/entities/team-membership.entity';
import { CreateTaskDto } from '../dtos/create-task.dto';
import { UpdateTaskDto } from '../dtos/update-task.dto';
import { MoveTaskDto } from '../dtos/move-task.dto';
import { AssignTaskDto } from '../dtos/assign-task.dto';
import { TaskFilterDto } from '../dtos/task-filter.dto';
import {
  PaginatedResult,
  PaginationMeta,
} from '../../../../shared/application/pagination.dto';

interface CurrentUser {
  id: string;
  roles: string[];
  orgId?: string | null;
}

const ADMIN_ROLES = ['admin', 'owner'];

/** Valid task status transitions: from → [allowed destinations] */
const STATUS_TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
  [TaskStatus.PLANNING]: [TaskStatus.IN_PROGRESS, TaskStatus.CANCELLED],
  [TaskStatus.IN_PROGRESS]: [
    TaskStatus.IN_REVIEW,
    TaskStatus.DONE,
    TaskStatus.PLANNING,
    TaskStatus.CANCELLED,
  ],
  [TaskStatus.IN_REVIEW]: [TaskStatus.DONE, TaskStatus.IN_PROGRESS, TaskStatus.CANCELLED],
  [TaskStatus.DONE]: [TaskStatus.IN_PROGRESS, TaskStatus.PLANNING],
  [TaskStatus.CANCELLED]: [TaskStatus.PLANNING, TaskStatus.IN_PROGRESS, TaskStatus.IN_REVIEW, TaskStatus.DONE],
};

@Injectable()
export class TaskService {
  constructor(
    @Inject(TASK_REPOSITORY)
    private readonly taskRepository: ITaskRepository,
    private readonly projectService: ProjectService,
    private readonly teamService: TeamService,
    @InjectRepository(TeamMembership)
    private readonly membershipRepo: Repository<TeamMembership>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  // ─── CRUD ──────────────────────────────────────────────

  async create(dto: CreateTaskDto, currentUser: CurrentUser): Promise<Task> {
    const project = await this.projectService.findById(dto.projectId);
    if (project.teamId) {
      await this.assertTeamMemberOrAdmin(project.teamId, currentUser);
    }

    let materializedPath = '';
    let depth = 0;

    if (dto.parentId) {
      const parent = await this.taskRepository.findById(dto.parentId);
      if (!parent) {
        throw new NotFoundException('Parent task not found');
      }
      if (parent.projectId !== dto.projectId) {
        throw new BadRequestException(
          'Parent task must belong to the same project',
        );
      }
      materializedPath = parent.materializedPath
        ? `${parent.materializedPath}.${parent.id}`
        : parent.id;
      depth = parent.depth + 1;
    }

    const maxPosition =
      await this.taskRepository.getMaxPositionAmongSiblings(
        dto.projectId,
        dto.parentId ?? null,
      );

    // Auto-generate task code
    const code = await this.generateTaskCode(dto.projectId);

    const task = new Task();
    task.title = dto.title;
    task.description = dto.description ?? null;
    task.projectId = dto.projectId;
    task.parentId = dto.parentId ?? null;
    task.priority = dto.priority ?? task.priority;
    task.workType = dto.workType ?? null;
    task.estimatedHours = dto.estimatedHours ?? null;
    task.volume = dto.volume ?? null;
    task.unitOfMeasure = dto.unitOfMeasure ?? null;
    task.assigneeId = dto.assigneeId ?? null;
    task.code = code;
    task.startDate = dto.startDate ? new Date(dto.startDate) : null;
    task.dueDate = dto.dueDate ? new Date(dto.dueDate) : null;
    task.materializedPath = materializedPath;
    task.depth = depth;
    task.position = maxPosition + 1;
    task.createdBy = currentUser.id;

    const saved = await this.taskRepository.save(task);
    const result = await this.taskRepository.findById(saved.id);
    this.eventEmitter.emit('task.created', {
      task: result,
      actorId: currentUser.id,
    });
    return result;
  }

  async findById(id: string): Promise<Task> {
    const task = await this.taskRepository.findById(id);
    if (!task) {
      throw new NotFoundException('Task not found');
    }
    return task;
  }

  async update(
    id: string,
    dto: UpdateTaskDto,
    currentUser: CurrentUser,
  ): Promise<Task> {
    const task = await this.findById(id);
    const project = await this.projectService.findById(task.projectId);
    if (project.teamId) {
      await this.assertTeamMemberOrAdmin(project.teamId, currentUser);
    }

    const oldStatus = task.status;

    // Validate status transition
    if (dto.status !== undefined && dto.status !== task.status) {
      this.validateStatusTransition(task.status, dto.status);

      // Cascade cancel to non-completed children
      if (dto.status === TaskStatus.CANCELLED) {
        await this.cascadeCancel(task.id);
      }

      // Set completedAt when task ends
      if (dto.status === TaskStatus.DONE) {
        task.completedAt = new Date();
      }
    }

    if (dto.title !== undefined) task.title = dto.title;
    if (dto.description !== undefined) task.description = dto.description;
    if (dto.status !== undefined) task.status = dto.status;
    if (dto.priority !== undefined) task.priority = dto.priority;
    if (dto.workType !== undefined) task.workType = dto.workType;
    if (dto.acceptance !== undefined) task.acceptance = dto.acceptance;
    if (dto.progress !== undefined) task.progress = dto.progress;
    if (dto.estimatedHours !== undefined) task.estimatedHours = dto.estimatedHours;
    if (dto.volume !== undefined) task.volume = dto.volume;
    if (dto.unitOfMeasure !== undefined) task.unitOfMeasure = dto.unitOfMeasure;
    if (dto.assigneeId !== undefined) task.assigneeId = dto.assigneeId;
    if (dto.startDate !== undefined)
      task.startDate = dto.startDate ? new Date(dto.startDate) : null;
    if (dto.dueDate !== undefined)
      task.dueDate = dto.dueDate ? new Date(dto.dueDate) : null;

    const saved = await this.taskRepository.save(task);

    if (dto.status !== undefined && dto.status !== oldStatus) {
      this.eventEmitter.emit('task.status_changed', {
        task: saved,
        actorId: currentUser.id,
        oldStatus,
        newStatus: dto.status,
      });
    }
    this.eventEmitter.emit('task.updated', {
      task: saved,
      actorId: currentUser.id,
      changes: dto,
    });

    // Check if all siblings are done — suggest parent completion
    if (
      dto.status === TaskStatus.DONE &&
      task.parentId &&
      (await this.taskRepository.areAllChildrenDone(task.parentId))
    ) {
      (saved as any).meta = {
        allSiblingsDone: true,
        parentId: task.parentId,
        suggestion: 'All child tasks are done. Consider marking the parent task as done.',
      };
    }

    return saved;
  }

  async softDelete(id: string, currentUser: CurrentUser): Promise<void> {
    const task = await this.findById(id);
    const project = await this.projectService.findById(task.projectId);
    if (project.teamId) {
      await this.assertTeamManagerOrAdmin(project.teamId, currentUser);
    }

    const descendantIds = await this.taskRepository.findAllChildrenIds(id);
    await this.taskRepository.softDeleteMany([id, ...descendantIds]);
    this.eventEmitter.emit('task.deleted', {
      taskId: id,
      actorId: currentUser.id,
    });
  }

  // ─── Hierarchy queries ─────────────────────────────────

  async findChildren(taskId: string): Promise<Task[]> {
    await this.findById(taskId);
    return this.taskRepository.findChildren(taskId);
  }

  async findSubtree(taskId: string): Promise<Task[]> {
    const task = await this.findById(taskId);
    const pathPrefix = task.materializedPath
      ? `${task.materializedPath}.${task.id}`
      : task.id;
    return this.taskRepository.findSubtree(pathPrefix);
  }

  async findByProject(
    projectId: string,
    filterDto: TaskFilterDto,
  ): Promise<PaginatedResult<Task>> {
    await this.projectService.findById(projectId);
    const skip = (filterDto.page - 1) * filterDto.limit;
    const filters = {
      status: filterDto.status,
      priority: filterDto.priority,
      assigneeId: filterDto.assigneeId,
      search: filterDto.search,
      sortBy: filterDto.sortBy,
      sortOrder: filterDto.sortOrder,
      maxDepth: filterDto.depth ?? 0,
    };

    const [tasks, total] = await this.taskRepository.findByProject(
      projectId,
      filters,
      skip,
      filterDto.limit,
    );

    return new PaginatedResult(
      tasks,
      new PaginationMeta(filterDto.page, filterDto.limit, total),
    );
  }

  async findForUser(
    currentUser: CurrentUser,
    filterDto: TaskFilterDto,
  ): Promise<PaginatedResult<Task>> {
    const skip = (filterDto.page - 1) * filterDto.limit;
    const filters = {
      projectId: filterDto.projectId,
      status: filterDto.status,
      priority: filterDto.priority,
      assigneeId: filterDto.assigneeId,
      search: filterDto.search,
      sortBy: filterDto.sortBy,
      sortOrder: filterDto.sortOrder,
    };

    const [tasks, total] = await this.taskRepository.findForUser(
      currentUser.id,
      filters,
      skip,
      filterDto.limit,
    );

    return new PaginatedResult(
      tasks,
      new PaginationMeta(filterDto.page, filterDto.limit, total),
    );
  }

  async findProjectTree(projectId: string): Promise<any[]> {
    await this.projectService.findById(projectId);

    const [allTasks] = await this.taskRepository.findByProject(
      projectId,
      {},
      0,
      10000,
    );

    return this.buildTree(allTasks);
  }

  // ─── Move / Reorder ───────────────────────────────────

  async moveTask(
    id: string,
    dto: MoveTaskDto,
    currentUser: CurrentUser,
  ): Promise<Task> {
    const task = await this.findById(id);
    const project = await this.projectService.findById(task.projectId);
    if (project.teamId) {
      await this.assertTeamManagerOrAdmin(project.teamId, currentUser);
    }

    const parentChanging = dto.parentId !== undefined;
    const oldParentId = task.parentId;

    if (parentChanging) {
      const newParentId = dto.parentId;

      // Validate: cannot move a task to be its own descendant
      if (newParentId) {
        const newParent = await this.taskRepository.findById(newParentId);
        if (!newParent) {
          throw new NotFoundException('New parent task not found');
        }
        if (newParent.projectId !== task.projectId) {
          throw new BadRequestException(
            'New parent task must belong to the same project',
          );
        }
        // Check for circular reference
        const newParentPath = newParent.materializedPath || '';
        const taskPathPrefix = task.materializedPath
          ? `${task.materializedPath}.${task.id}`
          : task.id;
        if (
          newParentId === id ||
          newParentPath.startsWith(taskPathPrefix)
        ) {
          throw new BadRequestException(
            'Cannot move a task to its own descendant',
          );
        }
      }

      // Compute old and new paths
      const oldPathPrefix = task.materializedPath
        ? `${task.materializedPath}.${task.id}`
        : task.id;

      let newMaterializedPath = '';
      let newDepth = 0;

      if (newParentId) {
        const newParent = await this.taskRepository.findById(newParentId);
        newMaterializedPath = newParent.materializedPath
          ? `${newParent.materializedPath}.${newParent.id}`
          : newParent.id;
        newDepth = newParent.depth + 1;
      }

      const newPathPrefix = newMaterializedPath
        ? `${newMaterializedPath}.${task.id}`
        : task.id;

      const depthDelta = newDepth - task.depth;

      // Bulk update all descendants' paths
      if (oldPathPrefix !== newPathPrefix) {
        await this.taskRepository.updateSubtreePaths(
          oldPathPrefix,
          newPathPrefix,
          depthDelta,
        );
      }

      // Update the task itself
      task.parentId = newParentId ?? null;
      task.materializedPath = newMaterializedPath;
      task.depth = newDepth;

      // Compute new position if not specified
      if (dto.position === undefined) {
        const maxPos =
          await this.taskRepository.getMaxPositionAmongSiblings(
            task.projectId,
            newParentId ?? null,
          );
        task.position = maxPos + 1;
      }
    }

    if (dto.position !== undefined) {
      task.position = dto.position;
    }

    const saved = await this.taskRepository.save(task);
    const result = await this.taskRepository.findById(saved.id);
    this.eventEmitter.emit('task.moved', {
      task: result,
      actorId: currentUser.id,
      oldParentId,
    });
    return result;
  }

  // ─── Assignment ────────────────────────────────────────

  async assignUsers(
    taskId: string,
    dto: AssignTaskDto,
    currentUser: CurrentUser,
  ): Promise<TaskAssignee[]> {
    const task = await this.findById(taskId);
    const project = await this.projectService.findById(task.projectId);

    for (const userId of dto.userIds) {
      // Verify user is a member of the project's team (if team-scoped)
      if (project.teamId) {
        const membership = await this.membershipRepo.findOne({
          where: { teamId: project.teamId, userId },
        });
        if (!membership) {
          throw new BadRequestException(
            `User ${userId} is not a member of the project's team`,
          );
        }
      }

      // Check for duplicate assignment
      const existing = await this.taskRepository.findAssignee(taskId, userId);
      if (existing) {
        throw new ConflictException(
          `User ${userId} is already assigned to this task`,
        );
      }

      const assignee = new TaskAssignee();
      assignee.taskId = taskId;
      assignee.userId = userId;
      assignee.assignedBy = currentUser.id;
      await this.taskRepository.saveAssignee(assignee);
      this.eventEmitter.emit('task.assigned', {
        taskId,
        userId,
        actorId: currentUser.id,
      });
    }

    return this.taskRepository.findAssigneesByTask(taskId);
  }

  async unassignUser(
    taskId: string,
    userId: string,
    currentUser: CurrentUser,
  ): Promise<void> {
    await this.findById(taskId);

    const assignee = await this.taskRepository.findAssignee(taskId, userId);
    if (!assignee) {
      throw new NotFoundException('Assignment not found');
    }

    await this.taskRepository.removeAssignee(assignee);
    this.eventEmitter.emit('task.unassigned', {
      taskId,
      userId,
      actorId: currentUser.id,
    });
  }

  async getAssignees(taskId: string): Promise<TaskAssignee[]> {
    await this.findById(taskId);
    return this.taskRepository.findAssigneesByTask(taskId);
  }

  // ─── Private helpers ───────────────────────────────────

  private async cascadeCancel(parentId: string): Promise<void> {
    const children =
      await this.taskRepository.findNonCompletedChildren(parentId);

    for (const child of children) {
      child.status = TaskStatus.CANCELLED;
      await this.taskRepository.save(child);
      await this.cascadeCancel(child.id);
    }
  }

  private validateStatusTransition(
    currentStatus: TaskStatus,
    newStatus: TaskStatus,
  ): void {
    const allowed = STATUS_TRANSITIONS[currentStatus];
    if (!allowed || !allowed.includes(newStatus)) {
      throw new BadRequestException(
        `Invalid status transition from '${currentStatus}' to '${newStatus}'`,
      );
    }
  }

  private async assertTeamMemberOrAdmin(
    teamId: string | null,
    currentUser: CurrentUser,
  ): Promise<void> {
    const isAdmin = currentUser.roles.some((r) => ADMIN_ROLES.includes(r));
    if (isAdmin) return;
    if (!teamId) return;

    const membership = await this.membershipRepo.findOne({
      where: { teamId, userId: currentUser.id },
    });
    if (!membership) {
      throw new ForbiddenException(
        'You must be a team member or system admin to perform this action',
      );
    }
  }

  private async assertTeamManagerOrAdmin(
    teamId: string | null,
    currentUser: CurrentUser,
  ): Promise<void> {
    const isAdmin = currentUser.roles.some((r) => ADMIN_ROLES.includes(r));
    if (isAdmin) return;
    if (!teamId) return;

    const isManager = await this.teamService.isTeamManager(
      teamId,
      currentUser.id,
    );
    if (!isManager) {
      throw new ForbiddenException(
        'You must be a team manager or system admin to perform this action',
      );
    }
  }

  private async generateTaskCode(projectId: string): Promise<string> {
    const result = await this.membershipRepo.manager
      .createQueryBuilder()
      .select('COUNT(*)', 'count')
      .from('tasks', 't')
      .where('t.project_id = :projectId', { projectId })
      .getRawOne();
    const count = parseInt(result?.count || '0', 10) + 1;
    return `TSK-${count.toString().padStart(3, '0')}`;
  }

  private buildTree(tasks: Task[]): any[] {
    const taskMap = new Map<string, any>();
    const roots: any[] = [];

    // First pass: index all tasks
    for (const task of tasks) {
      taskMap.set(task.id, { ...task, children: [] });
    }

    // Second pass: build parent-child relationships
    for (const task of tasks) {
      const node = taskMap.get(task.id);
      if (task.parentId && taskMap.has(task.parentId)) {
        taskMap.get(task.parentId).children.push(node);
      } else {
        roots.push(node);
      }
    }

    return roots;
  }
}
