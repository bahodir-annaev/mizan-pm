import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { getRepositoryToken } from '@nestjs/typeorm';
import { TaskService } from './task.service';
import { ProjectService } from './project.service';
import { Task } from '../../domain/entities/task.entity';
import { TaskAssignee } from '../../domain/entities/task-assignee.entity';
import { TaskStatus } from '../../domain/entities/task-status.enum';
import { TaskPriority } from '../../domain/entities/task-priority.enum';
import { TASK_REPOSITORY } from '../../domain/repositories/task-repository.interface';
import { TeamMembership } from '../../../organization/domain/entities/team-membership.entity';
import { TeamService } from '../../../organization/application/services/team.service';

describe('TaskService', () => {
  let service: TaskService;
  let taskRepo: any;
  let projectService: any;
  let teamService: any;
  let membershipRepo: any;
  let eventEmitter: any;

  const adminUser = { id: 'admin-1', roles: ['admin'] };
  const managerUser = { id: 'manager-1', roles: ['manager'] };
  const memberUser = { id: 'member-1', roles: ['member'] };

  const mockProject = {
    id: 'project-1',
    name: 'Office Building',
    teamId: 'team-1',
    createdBy: 'admin-1',
  };

  const mockTask: Partial<Task> = {
    id: 'task-1',
    title: 'Design facade',
    description: null,
    status: TaskStatus.PLANNING,
    priority: TaskPriority.MEDIUM,
    projectId: 'project-1',
    parentId: null,
    materializedPath: '',
    depth: 0,
    position: 0,
    createdBy: 'admin-1',
    startDate: null,
    dueDate: null,
  };

  const mockParentTask: Partial<Task> = {
    id: 'parent-1',
    title: 'Phase 1',
    status: TaskStatus.IN_PROGRESS,
    projectId: 'project-1',
    parentId: null,
    materializedPath: '',
    depth: 0,
    position: 0,
    createdBy: 'admin-1',
  };

  beforeEach(async () => {
    taskRepo = {
      findById: jest.fn(),
      save: jest.fn().mockImplementation((task: any) => ({
        id: task.id || 'task-new',
        ...task,
      })),
      saveMany: jest.fn(),
      softDelete: jest.fn(),
      softDeleteMany: jest.fn(),
      findChildren: jest.fn(),
      findSubtree: jest.fn(),
      findTopLevelByProject: jest.fn(),
      findByProject: jest.fn(),
      getMaxPositionAmongSiblings: jest.fn().mockResolvedValue(-1),
      updateSubtreePaths: jest.fn(),
      findAssignee: jest.fn(),
      findAssigneesByTask: jest.fn(),
      saveAssignee: jest.fn().mockImplementation((a: any) => ({
        id: 'assignee-new',
        ...a,
      })),
      removeAssignee: jest.fn(),
      findNonCompletedChildren: jest.fn().mockResolvedValue([]),
      findAllChildrenIds: jest.fn().mockResolvedValue([]),
      areAllChildrenDone: jest.fn().mockResolvedValue(false),
    };

    projectService = {
      findById: jest.fn().mockResolvedValue(mockProject),
    };

    teamService = {
      findById: jest.fn(),
      isTeamManager: jest.fn(),
    };

    membershipRepo = {
      findOne: jest.fn(),
      manager: {
        createQueryBuilder: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnThis(),
          from: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          getRawOne: jest.fn().mockResolvedValue({ count: '0' }),
        }),
      },
    };

    eventEmitter = {
      emit: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TaskService,
        { provide: TASK_REPOSITORY, useValue: taskRepo },
        { provide: ProjectService, useValue: projectService },
        { provide: TeamService, useValue: teamService },
        {
          provide: getRepositoryToken(TeamMembership),
          useValue: membershipRepo,
        },
        { provide: EventEmitter2, useValue: eventEmitter },
      ],
    }).compile();

    service = module.get<TaskService>(TaskService);
  });

  // ─── CREATE ────────────────────────────────────────────

  describe('create', () => {
    it('should create a top-level task with correct defaults', async () => {
      taskRepo.findById.mockResolvedValue({ ...mockTask, id: 'task-new' });

      const result = await service.create(
        { title: 'Design facade', projectId: 'project-1' },
        adminUser,
      );

      expect(taskRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Design facade',
          projectId: 'project-1',
          parentId: null,
          materializedPath: '',
          depth: 0,
          position: 0,
          createdBy: 'admin-1',
        }),
      );
    });

    it('should create a sub-task with correct materializedPath and depth', async () => {
      taskRepo.findById
        .mockResolvedValueOnce(mockParentTask) // parent lookup
        .mockResolvedValueOnce({ ...mockTask, id: 'task-new' }); // reload after save
      taskRepo.getMaxPositionAmongSiblings.mockResolvedValue(1);

      const result = await service.create(
        {
          title: 'Sub-task 1',
          projectId: 'project-1',
          parentId: 'parent-1',
        },
        adminUser,
      );

      expect(taskRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          parentId: 'parent-1',
          materializedPath: 'parent-1',
          depth: 1,
          position: 2,
        }),
      );
    });

    it('should create a nested sub-task (depth=2) with multi-segment path', async () => {
      const childTask = {
        ...mockTask,
        id: 'child-1',
        parentId: 'parent-1',
        materializedPath: 'parent-1',
        depth: 1,
        projectId: 'project-1',
      };

      taskRepo.findById
        .mockResolvedValueOnce(childTask) // parent lookup
        .mockResolvedValueOnce({ ...mockTask, id: 'task-new' }); // reload after save

      const result = await service.create(
        {
          title: 'Grand-child',
          projectId: 'project-1',
          parentId: 'child-1',
        },
        adminUser,
      );

      expect(taskRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          materializedPath: 'parent-1.child-1',
          depth: 2,
        }),
      );
    });

    it('should throw NotFoundException when project does not exist', async () => {
      projectService.findById.mockRejectedValue(
        new NotFoundException('Project not found'),
      );

      await expect(
        service.create(
          { title: 'Task', projectId: 'nonexistent' },
          adminUser,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when parent task does not exist', async () => {
      taskRepo.findById.mockResolvedValue(null);

      await expect(
        service.create(
          { title: 'Task', projectId: 'project-1', parentId: 'nonexistent' },
          adminUser,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when parent belongs to different project', async () => {
      taskRepo.findById.mockResolvedValue({
        ...mockParentTask,
        projectId: 'other-project',
      });

      await expect(
        service.create(
          { title: 'Task', projectId: 'project-1', parentId: 'parent-1' },
          adminUser,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ForbiddenException when user is not a team member', async () => {
      membershipRepo.findOne.mockResolvedValue(null);

      await expect(
        service.create(
          { title: 'Task', projectId: 'project-1' },
          memberUser,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should succeed when user is admin (bypasses team membership)', async () => {
      taskRepo.findById.mockResolvedValue({ ...mockTask, id: 'task-new' });

      const result = await service.create(
        { title: 'Task', projectId: 'project-1' },
        adminUser,
      );

      expect(membershipRepo.findOne).not.toHaveBeenCalled();
      expect(taskRepo.save).toHaveBeenCalled();
    });
  });

  // ─── FIND BY ID ────────────────────────────────────────

  describe('findById', () => {
    it('should return a task with relations', async () => {
      taskRepo.findById.mockResolvedValue(mockTask);

      const result = await service.findById('task-1');

      expect(result).toEqual(mockTask);
      expect(taskRepo.findById).toHaveBeenCalledWith('task-1');
    });

    it('should throw NotFoundException when task not found', async () => {
      taskRepo.findById.mockResolvedValue(null);

      await expect(service.findById('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ─── UPDATE ────────────────────────────────────────────

  describe('update', () => {
    it('should update title and description without touching status', async () => {
      taskRepo.findById.mockResolvedValue({ ...mockTask });
      taskRepo.save.mockImplementation((t: any) => t);

      const result = await service.update(
        'task-1',
        { title: 'Updated', description: 'New desc' },
        adminUser,
      );

      expect(result.title).toBe('Updated');
      expect(result.description).toBe('New desc');
      expect(result.status).toBe(TaskStatus.PLANNING);
    });

    it('should throw ForbiddenException when non-member tries to update', async () => {
      taskRepo.findById.mockResolvedValue({ ...mockTask });
      membershipRepo.findOne.mockResolvedValue(null);

      await expect(
        service.update('task-1', { title: 'Hacked' }, memberUser),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ─── STATUS TRANSITIONS ───────────────────────────────

  describe('update - status transitions', () => {
    it('should allow valid transition: start → in_progress', async () => {
      taskRepo.findById.mockResolvedValue({
        ...mockTask,
        status: TaskStatus.PLANNING,
      });
      taskRepo.save.mockImplementation((t: any) => t);

      const result = await service.update(
        'task-1',
        { status: TaskStatus.IN_PROGRESS },
        adminUser,
      );

      expect(result.status).toBe(TaskStatus.IN_PROGRESS);
    });

    it('should allow valid transition: in_progress → burning', async () => {
      taskRepo.findById.mockResolvedValue({
        ...mockTask,
        status: TaskStatus.IN_PROGRESS,
      });
      taskRepo.save.mockImplementation((t: any) => t);

      const result = await service.update(
        'task-1',
        { status: TaskStatus.IN_REVIEW },
        adminUser,
      );

      expect(result.status).toBe(TaskStatus.IN_REVIEW);
    });

    it('should allow valid transition: burning → end', async () => {
      taskRepo.findById.mockResolvedValue({
        ...mockTask,
        status: TaskStatus.IN_REVIEW,
      });
      taskRepo.save.mockImplementation((t: any) => t);

      const result = await service.update(
        'task-1',
        { status: TaskStatus.DONE },
        adminUser,
      );

      expect(result.status).toBe(TaskStatus.DONE);
    });

    it('should allow valid transition: end → in_progress (reopen)', async () => {
      taskRepo.findById.mockResolvedValue({
        ...mockTask,
        status: TaskStatus.DONE,
      });
      taskRepo.save.mockImplementation((t: any) => t);

      const result = await service.update(
        'task-1',
        { status: TaskStatus.IN_PROGRESS },
        adminUser,
      );

      expect(result.status).toBe(TaskStatus.IN_PROGRESS);
    });

    it('should allow valid transition: cancelled → start (restore)', async () => {
      taskRepo.findById.mockResolvedValue({
        ...mockTask,
        status: TaskStatus.CANCELLED,
      });
      taskRepo.save.mockImplementation((t: any) => t);

      const result = await service.update(
        'task-1',
        { status: TaskStatus.PLANNING },
        adminUser,
      );

      expect(result.status).toBe(TaskStatus.PLANNING);
    });

    it('should allow valid transition: start → cancelled', async () => {
      taskRepo.findById.mockResolvedValue({
        ...mockTask,
        status: TaskStatus.PLANNING,
      });
      taskRepo.save.mockImplementation((t: any) => t);

      const result = await service.update(
        'task-1',
        { status: TaskStatus.CANCELLED },
        adminUser,
      );

      expect(result.status).toBe(TaskStatus.CANCELLED);
    });

    it('should reject invalid transition: start → end', async () => {
      taskRepo.findById.mockResolvedValue({
        ...mockTask,
        status: TaskStatus.PLANNING,
      });

      await expect(
        service.update(
          'task-1',
          { status: TaskStatus.DONE },
          adminUser,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject invalid transition: end → cancelled', async () => {
      taskRepo.findById.mockResolvedValue({
        ...mockTask,
        status: TaskStatus.DONE,
      });

      await expect(
        service.update(
          'task-1',
          { status: TaskStatus.CANCELLED },
          adminUser,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject invalid transition: burning → start', async () => {
      taskRepo.findById.mockResolvedValue({
        ...mockTask,
        status: TaskStatus.IN_REVIEW,
      });

      await expect(
        service.update(
          'task-1',
          { status: TaskStatus.PLANNING },
          adminUser,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should not validate when status is unchanged', async () => {
      taskRepo.findById.mockResolvedValue({
        ...mockTask,
        status: TaskStatus.PLANNING,
      });
      taskRepo.save.mockImplementation((t: any) => t);

      const result = await service.update(
        'task-1',
        { status: TaskStatus.PLANNING },
        adminUser,
      );

      expect(result.status).toBe(TaskStatus.PLANNING);
    });
  });

  // ─── CASCADING CANCEL ─────────────────────────────────

  describe('update - cascading cancel', () => {
    it('should cascade cancel to non-completed children', async () => {
      const child1 = {
        ...mockTask,
        id: 'child-1',
        parentId: 'task-1',
        status: TaskStatus.IN_PROGRESS,
      };
      const child2 = {
        ...mockTask,
        id: 'child-2',
        parentId: 'task-1',
        status: TaskStatus.PLANNING,
      };

      taskRepo.findById.mockResolvedValue({
        ...mockTask,
        status: TaskStatus.IN_PROGRESS,
      });
      taskRepo.save.mockImplementation((t: any) => t);
      taskRepo.findNonCompletedChildren
        .mockResolvedValueOnce([child1, child2]) // children of task-1
        .mockResolvedValue([]); // no grandchildren

      await service.update(
        'task-1',
        { status: TaskStatus.CANCELLED },
        adminUser,
      );

      // Should have saved the children with cancelled status
      expect(taskRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'child-1',
          status: TaskStatus.CANCELLED,
        }),
      );
      expect(taskRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'child-2',
          status: TaskStatus.CANCELLED,
        }),
      );
    });

    it('should NOT cancel children that are already done', async () => {
      const doneChild = {
        ...mockTask,
        id: 'done-child',
        parentId: 'task-1',
        status: TaskStatus.DONE,
      };

      taskRepo.findById.mockResolvedValue({
        ...mockTask,
        status: TaskStatus.IN_PROGRESS,
      });
      taskRepo.save.mockImplementation((t: any) => t);
      // findNonCompletedChildren excludes DONE and CANCELLED
      taskRepo.findNonCompletedChildren.mockResolvedValue([]);

      await service.update(
        'task-1',
        { status: TaskStatus.CANCELLED },
        adminUser,
      );

      // Only the parent task itself should be saved (not the done child)
      expect(taskRepo.save).toHaveBeenCalledTimes(1);
    });

    it('should recursively cascade cancel through multiple levels', async () => {
      const child = {
        ...mockTask,
        id: 'child-1',
        parentId: 'task-1',
        status: TaskStatus.PLANNING,
      };
      const grandchild = {
        ...mockTask,
        id: 'grandchild-1',
        parentId: 'child-1',
        status: TaskStatus.PLANNING,
      };

      taskRepo.findById.mockResolvedValue({
        ...mockTask,
        status: TaskStatus.IN_PROGRESS,
      });
      taskRepo.save.mockImplementation((t: any) => t);
      taskRepo.findNonCompletedChildren
        .mockResolvedValueOnce([child]) // children of task-1
        .mockResolvedValueOnce([grandchild]) // children of child-1
        .mockResolvedValue([]); // no great-grandchildren

      await service.update(
        'task-1',
        { status: TaskStatus.CANCELLED },
        adminUser,
      );

      expect(taskRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'grandchild-1', status: TaskStatus.CANCELLED }),
      );
    });
  });

  // ─── SOFT DELETE ───────────────────────────────────────

  describe('softDelete', () => {
    it('should soft delete a leaf task', async () => {
      taskRepo.findById.mockResolvedValue(mockTask);
      taskRepo.findAllChildrenIds.mockResolvedValue([]);

      await service.softDelete('task-1', adminUser);

      expect(taskRepo.softDeleteMany).toHaveBeenCalledWith(['task-1']);
    });

    it('should soft delete parent and all descendants', async () => {
      taskRepo.findById.mockResolvedValue(mockTask);
      taskRepo.findAllChildrenIds.mockResolvedValue([
        'child-1',
        'grandchild-1',
      ]);

      await service.softDelete('task-1', adminUser);

      expect(taskRepo.softDeleteMany).toHaveBeenCalledWith([
        'task-1',
        'child-1',
        'grandchild-1',
      ]);
    });

    it('should throw ForbiddenException when non-manager tries to delete', async () => {
      taskRepo.findById.mockResolvedValue(mockTask);
      teamService.isTeamManager.mockResolvedValue(false);

      await expect(
        service.softDelete('task-1', memberUser),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ─── FIND CHILDREN / SUBTREE ──────────────────────────

  describe('findChildren', () => {
    it('should return direct children ordered by position', async () => {
      const children = [
        { ...mockTask, id: 'child-1', position: 0 },
        { ...mockTask, id: 'child-2', position: 1 },
      ];
      taskRepo.findById.mockResolvedValue(mockTask);
      taskRepo.findChildren.mockResolvedValue(children);

      const result = await service.findChildren('task-1');

      expect(result).toHaveLength(2);
      expect(taskRepo.findChildren).toHaveBeenCalledWith('task-1');
    });
  });

  describe('findSubtree', () => {
    it('should return entire subtree using materializedPath prefix', async () => {
      const subtree = [
        { ...mockTask, id: 'task-1', materializedPath: '', depth: 0 },
        {
          ...mockTask,
          id: 'child-1',
          materializedPath: 'task-1',
          depth: 1,
        },
      ];
      taskRepo.findById.mockResolvedValue({
        ...mockTask,
        id: 'task-1',
        materializedPath: '',
      });
      taskRepo.findSubtree.mockResolvedValue(subtree);

      const result = await service.findSubtree('task-1');

      expect(taskRepo.findSubtree).toHaveBeenCalledWith('task-1');
      expect(result).toHaveLength(2);
    });
  });

  // ─── FIND BY PROJECT ──────────────────────────────────

  describe('findByProject', () => {
    it('should return paginated top-level tasks', async () => {
      taskRepo.findTopLevelByProject.mockResolvedValue([[mockTask], 1]);

      const result = await service.findByProject('project-1', {
        page: 1,
        limit: 20,
      } as any);

      expect(result.items).toHaveLength(1);
      expect(result.meta.totalItems).toBe(1);
      expect(taskRepo.findTopLevelByProject).toHaveBeenCalledWith(
        'project-1',
        expect.any(Object),
        0,
        20,
      );
    });

    it('should pass filter params to repository', async () => {
      taskRepo.findTopLevelByProject.mockResolvedValue([[], 0]);

      await service.findByProject('project-1', {
        page: 1,
        limit: 20,
        status: TaskStatus.PLANNING,
        priority: TaskPriority.HIGH,
        search: 'design',
      } as any);

      expect(taskRepo.findTopLevelByProject).toHaveBeenCalledWith(
        'project-1',
        expect.objectContaining({
          status: TaskStatus.PLANNING,
          priority: TaskPriority.HIGH,
          search: 'design',
        }),
        0,
        20,
      );
    });
  });

  describe('findProjectTree', () => {
    it('should build a tree structure from flat tasks', async () => {
      const rootTask = {
        ...mockTask,
        id: 'root-1',
        parentId: null,
        depth: 0,
      };
      const childTask = {
        ...mockTask,
        id: 'child-1',
        parentId: 'root-1',
        depth: 1,
      };

      taskRepo.findByProject.mockResolvedValue([[rootTask, childTask], 2]);

      const result = await service.findProjectTree('project-1');

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('root-1');
      expect(result[0].children).toHaveLength(1);
      expect(result[0].children[0].id).toBe('child-1');
    });

    it('should return empty array for project with no tasks', async () => {
      taskRepo.findByProject.mockResolvedValue([[], 0]);

      const result = await service.findProjectTree('project-1');

      expect(result).toHaveLength(0);
    });
  });

  // ─── MOVE TASK ─────────────────────────────────────────

  describe('moveTask', () => {
    it('should move a task to a new parent', async () => {
      const newParent = {
        ...mockTask,
        id: 'new-parent',
        materializedPath: '',
        depth: 0,
        projectId: 'project-1',
      };
      taskRepo.findById
        .mockResolvedValueOnce({ ...mockTask, id: 'task-1' }) // findById
        .mockResolvedValueOnce(newParent) // new parent lookup
        .mockResolvedValueOnce(newParent) // new parent lookup (second call in moveTask)
        .mockResolvedValueOnce({ ...mockTask, id: 'task-1' }); // reload after save
      teamService.isTeamManager.mockResolvedValue(true);
      taskRepo.getMaxPositionAmongSiblings.mockResolvedValue(2);

      const result = await service.moveTask(
        'task-1',
        { parentId: 'new-parent' },
        managerUser,
      );

      expect(taskRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          parentId: 'new-parent',
          materializedPath: 'new-parent',
          depth: 1,
        }),
      );
    });

    it('should move a task to top-level (parentId = null)', async () => {
      const taskWithParent = {
        ...mockTask,
        id: 'task-1',
        parentId: 'old-parent',
        materializedPath: 'old-parent',
        depth: 1,
      };
      taskRepo.findById
        .mockResolvedValueOnce(taskWithParent) // findById
        .mockResolvedValueOnce({ ...taskWithParent, parentId: null }); // reload after save
      taskRepo.getMaxPositionAmongSiblings.mockResolvedValue(3);

      await service.moveTask(
        'task-1',
        { parentId: null },
        adminUser,
      );

      expect(taskRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          parentId: null,
          materializedPath: '',
          depth: 0,
        }),
      );
    });

    it('should reorder a task among siblings', async () => {
      taskRepo.findById
        .mockResolvedValueOnce({ ...mockTask }) // findById
        .mockResolvedValueOnce({ ...mockTask, position: 5 }); // reload

      await service.moveTask('task-1', { position: 5 }, adminUser);

      expect(taskRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ position: 5 }),
      );
    });

    it('should call updateSubtreePaths when moving parent with descendants', async () => {
      const newParent = {
        ...mockTask,
        id: 'new-parent',
        materializedPath: '',
        depth: 0,
        projectId: 'project-1',
      };
      taskRepo.findById
        .mockResolvedValueOnce({
          ...mockTask,
          id: 'task-1',
          materializedPath: '',
          depth: 0,
        }) // findById
        .mockResolvedValueOnce(newParent) // new parent lookup
        .mockResolvedValueOnce(newParent) // second fetch
        .mockResolvedValueOnce({ ...mockTask }); // reload
      teamService.isTeamManager.mockResolvedValue(true);

      await service.moveTask(
        'task-1',
        { parentId: 'new-parent' },
        managerUser,
      );

      expect(taskRepo.updateSubtreePaths).toHaveBeenCalledWith(
        'task-1', // old prefix
        'new-parent.task-1', // new prefix
        1, // depth delta
      );
    });

    it('should throw BadRequestException for circular reference', async () => {
      const task = {
        ...mockTask,
        id: 'task-1',
        materializedPath: '',
        depth: 0,
      };
      const descendant = {
        ...mockTask,
        id: 'descendant-1',
        materializedPath: 'task-1',
        depth: 1,
        projectId: 'project-1',
      };

      taskRepo.findById
        .mockResolvedValueOnce(task) // findById
        .mockResolvedValueOnce(descendant); // new parent lookup

      await expect(
        service.moveTask(
          'task-1',
          { parentId: 'descendant-1' },
          adminUser,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when moving to self', async () => {
      taskRepo.findById
        .mockResolvedValueOnce({ ...mockTask, id: 'task-1' })
        .mockResolvedValueOnce({
          ...mockTask,
          id: 'task-1',
          projectId: 'project-1',
        });

      await expect(
        service.moveTask('task-1', { parentId: 'task-1' }, adminUser),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ForbiddenException when non-manager tries to move', async () => {
      taskRepo.findById.mockResolvedValue(mockTask);
      teamService.isTeamManager.mockResolvedValue(false);

      await expect(
        service.moveTask('task-1', { parentId: null }, memberUser),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ─── ASSIGN USERS ─────────────────────────────────────

  describe('assignUsers', () => {
    it('should assign a single user to a task', async () => {
      taskRepo.findById.mockResolvedValue(mockTask);
      membershipRepo.findOne.mockResolvedValue({ teamId: 'team-1', userId: 'user-1' });
      taskRepo.findAssignee.mockResolvedValue(null);
      taskRepo.findAssigneesByTask.mockResolvedValue([
        { taskId: 'task-1', userId: 'user-1' },
      ]);
      teamService.isTeamManager.mockResolvedValue(true);

      const result = await service.assignUsers(
        'task-1',
        { userIds: ['user-1'] },
        managerUser,
      );

      expect(taskRepo.saveAssignee).toHaveBeenCalledWith(
        expect.objectContaining({
          taskId: 'task-1',
          userId: 'user-1',
          assignedBy: 'manager-1',
        }),
      );
      expect(result).toHaveLength(1);
    });

    it('should assign multiple users to a task', async () => {
      taskRepo.findById.mockResolvedValue(mockTask);
      membershipRepo.findOne.mockResolvedValue({ teamId: 'team-1' });
      taskRepo.findAssignee.mockResolvedValue(null);
      taskRepo.findAssigneesByTask.mockResolvedValue([
        { taskId: 'task-1', userId: 'user-1' },
        { taskId: 'task-1', userId: 'user-2' },
      ]);
      teamService.isTeamManager.mockResolvedValue(true);

      const result = await service.assignUsers(
        'task-1',
        { userIds: ['user-1', 'user-2'] },
        managerUser,
      );

      expect(taskRepo.saveAssignee).toHaveBeenCalledTimes(2);
      expect(result).toHaveLength(2);
    });

    it('should throw BadRequestException when user is not a team member', async () => {
      taskRepo.findById.mockResolvedValue(mockTask);
      membershipRepo.findOne.mockResolvedValue(null);
      teamService.isTeamManager.mockResolvedValue(true);

      await expect(
        service.assignUsers(
          'task-1',
          { userIds: ['non-member'] },
          managerUser,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ConflictException when user is already assigned', async () => {
      taskRepo.findById.mockResolvedValue(mockTask);
      membershipRepo.findOne.mockResolvedValue({ teamId: 'team-1' });
      taskRepo.findAssignee.mockResolvedValue({
        taskId: 'task-1',
        userId: 'user-1',
      });
      teamService.isTeamManager.mockResolvedValue(true);

      await expect(
        service.assignUsers(
          'task-1',
          { userIds: ['user-1'] },
          managerUser,
        ),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw BadRequestException when user is not a team member', async () => {
      taskRepo.findById.mockResolvedValue(mockTask);
      membershipRepo.findOne.mockResolvedValue(null);

      await expect(
        service.assignUsers(
          'task-1',
          { userIds: ['user-1'] },
          memberUser,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ─── UNASSIGN USER ────────────────────────────────────

  describe('unassignUser', () => {
    it('should remove an assignee from a task', async () => {
      const assignee = { taskId: 'task-1', userId: 'user-1' };
      taskRepo.findById.mockResolvedValue(mockTask);
      taskRepo.findAssignee.mockResolvedValue(assignee);
      teamService.isTeamManager.mockResolvedValue(true);

      await service.unassignUser('task-1', 'user-1', managerUser);

      expect(taskRepo.removeAssignee).toHaveBeenCalledWith(assignee);
    });

    it('should throw NotFoundException when assignment does not exist', async () => {
      taskRepo.findById.mockResolvedValue(mockTask);
      taskRepo.findAssignee.mockResolvedValue(null);
      teamService.isTeamManager.mockResolvedValue(true);

      await expect(
        service.unassignUser('task-1', 'user-1', managerUser),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when assignment does not exist for unassign', async () => {
      taskRepo.findById.mockResolvedValue(mockTask);
      taskRepo.findAssignee.mockResolvedValue(null);

      await expect(
        service.unassignUser('task-1', 'user-1', memberUser),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ─── GET ASSIGNEES ────────────────────────────────────

  describe('getAssignees', () => {
    it('should return all assignees for a task', async () => {
      const assignees = [
        { taskId: 'task-1', userId: 'user-1' },
        { taskId: 'task-1', userId: 'user-2' },
      ];
      taskRepo.findById.mockResolvedValue(mockTask);
      taskRepo.findAssigneesByTask.mockResolvedValue(assignees);

      const result = await service.getAssignees('task-1');

      expect(result).toHaveLength(2);
      expect(taskRepo.findAssigneesByTask).toHaveBeenCalledWith('task-1');
    });
  });

  // ─── ALL CHILDREN DONE HINT ───────────────────────────

  describe('update - all children done hint', () => {
    it('should include meta suggestion when all siblings are done', async () => {
      taskRepo.findById.mockResolvedValue({
        ...mockTask,
        status: TaskStatus.IN_REVIEW,
        parentId: 'parent-1',
      });
      taskRepo.save.mockImplementation((t: any) => t);
      taskRepo.areAllChildrenDone.mockResolvedValue(true);

      const result = await service.update(
        'task-1',
        { status: TaskStatus.DONE },
        adminUser,
      );

      expect((result as any).meta).toEqual(
        expect.objectContaining({
          allSiblingsDone: true,
          parentId: 'parent-1',
        }),
      );
    });
  });
});
