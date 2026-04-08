import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { getRepositoryToken } from '@nestjs/typeorm';
import { TimeTrackingService } from './time-tracking.service';
import { TimeEntry } from '../../domain/entities/time-entry.entity';
import { TIME_ENTRY_REPOSITORY } from '../../domain/repositories/time-entry-repository.interface';
import { TaskAssignee } from '../../../project-management/domain/entities/task-assignee.entity';

describe('TimeTrackingService', () => {
  let service: TimeTrackingService;
  let timeEntryRepo: any;
  let taskAssigneeRepo: any;
  let eventEmitter: any;

  const currentUser = { id: 'user-1', roles: ['member'] };
  const managerUser = { id: 'user-2', roles: ['manager'] };

  const mockEntry: Partial<TimeEntry> = {
    id: 'entry-1',
    taskId: 'task-1',
    userId: 'user-1',
    startTime: new Date('2026-02-09T08:00:00Z'),
    endTime: new Date('2026-02-09T10:00:00Z'),
    durationSeconds: 7200,
    isManual: false,
    description: null,
  };

  beforeEach(async () => {
    timeEntryRepo = {
      findById: jest.fn(),
      findActiveByUser: jest.fn(),
      findActiveByUserAndTask: jest.fn(),
      save: jest.fn().mockImplementation((entry: any) => ({
        id: 'entry-1',
        ...entry,
      })),
      remove: jest.fn(),
      findByTask: jest.fn(),
      findByUser: jest.fn(),
      getProjectTimeReport: jest.fn(),
    };

    taskAssigneeRepo = {
      findOne: jest.fn(),
    };

    eventEmitter = {
      emit: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TimeTrackingService,
        { provide: TIME_ENTRY_REPOSITORY, useValue: timeEntryRepo },
        { provide: getRepositoryToken(TaskAssignee), useValue: taskAssigneeRepo },
        { provide: EventEmitter2, useValue: eventEmitter },
      ],
    }).compile();

    service = module.get<TimeTrackingService>(TimeTrackingService);
  });

  describe('startTimer', () => {
    it('should start a timer when user is assigned', async () => {
      taskAssigneeRepo.findOne.mockResolvedValue({ id: 'assignment-1' });
      timeEntryRepo.findActiveByUser.mockResolvedValue(null);

      const result = await service.startTimer('task-1', currentUser);

      expect(result.started).toBeDefined();
      expect(result.started.taskId).toBe('task-1');
      expect(result.started.userId).toBe('user-1');
      expect(result.stopped).toBeUndefined();
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'time.started',
        expect.objectContaining({ entry: expect.any(Object) }),
      );
    });

    it('should start a timer when user has manager role even if not assigned', async () => {
      taskAssigneeRepo.findOne.mockResolvedValue(null);
      timeEntryRepo.findActiveByUser.mockResolvedValue(null);

      const result = await service.startTimer('task-1', managerUser);

      expect(result.started).toBeDefined();
      expect(result.started.taskId).toBe('task-1');
    });

    it('should throw ForbiddenException when user not assigned and not manager', async () => {
      taskAssigneeRepo.findOne.mockResolvedValue(null);

      await expect(
        service.startTimer('task-1', currentUser),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ConflictException when timer already running on same task', async () => {
      taskAssigneeRepo.findOne.mockResolvedValue({ id: 'assignment-1' });
      timeEntryRepo.findActiveByUser.mockResolvedValue({
        id: 'active-entry',
        taskId: 'task-1',
        userId: 'user-1',
      });

      await expect(
        service.startTimer('task-1', currentUser),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw ConflictException when timer running on another task without force', async () => {
      taskAssigneeRepo.findOne.mockResolvedValue({ id: 'assignment-1' });
      timeEntryRepo.findActiveByUser.mockResolvedValue({
        id: 'active-entry',
        taskId: 'task-other',
        userId: 'user-1',
      });

      await expect(
        service.startTimer('task-1', currentUser),
      ).rejects.toThrow(ConflictException);
    });

    it('should force stop existing timer and start new one when force=true', async () => {
      const existingEntry = {
        id: 'old-entry',
        taskId: 'task-old',
        userId: 'user-1',
        startTime: new Date(Date.now() - 3600000), // 1 hour ago
        endTime: null,
        durationSeconds: null,
      };

      taskAssigneeRepo.findOne.mockResolvedValue({ id: 'assignment-1' });
      timeEntryRepo.findActiveByUser.mockResolvedValue(existingEntry);
      timeEntryRepo.save.mockImplementation((entry: any) => ({ ...entry }));

      const result = await service.startTimer('task-1', currentUser, true);

      expect(result.stopped).toBeDefined();
      expect(result.stopped!.endTime).toBeInstanceOf(Date);
      expect(result.stopped!.durationSeconds).toBeGreaterThan(0);
      expect(result.started).toBeDefined();
      expect(result.started.taskId).toBe('task-1');

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'time.stopped',
        expect.objectContaining({ entry: expect.any(Object) }),
      );
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'time.started',
        expect.objectContaining({ entry: expect.any(Object) }),
      );
    });
  });

  describe('stopTimer', () => {
    it('should stop an active timer and compute duration', async () => {
      const activeEntry = {
        id: 'entry-1',
        taskId: 'task-1',
        userId: 'user-1',
        startTime: new Date(Date.now() - 1800000), // 30 min ago
        endTime: null,
        durationSeconds: null,
      };
      timeEntryRepo.findActiveByUserAndTask.mockResolvedValue(activeEntry);
      timeEntryRepo.save.mockImplementation((entry: any) => ({ ...entry }));

      const result = await service.stopTimer('task-1', currentUser);

      expect(result.endTime).toBeInstanceOf(Date);
      expect(result.durationSeconds).toBeGreaterThan(0);
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'time.stopped',
        expect.objectContaining({ entry: expect.any(Object), duration: expect.any(Number) }),
      );
    });

    it('should throw NotFoundException when no active timer on task', async () => {
      timeEntryRepo.findActiveByUserAndTask.mockResolvedValue(null);

      await expect(
        service.stopTimer('task-1', currentUser),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getTimeEntriesByTask', () => {
    it('should return paginated time entries for a task', async () => {
      timeEntryRepo.findByTask.mockResolvedValue([[mockEntry], 1]);

      const result = await service.getTimeEntriesByTask('task-1', {
        page: 1,
        limit: 20,
      });

      expect(timeEntryRepo.findByTask).toHaveBeenCalledWith('task-1', 0, 20);
      expect(result.items).toHaveLength(1);
      expect(result.meta.totalItems).toBe(1);
    });

    it('should return empty result when no entries exist', async () => {
      timeEntryRepo.findByTask.mockResolvedValue([[], 0]);

      const result = await service.getTimeEntriesByTask('task-1', {
        page: 1,
        limit: 20,
      });

      expect(result.items).toHaveLength(0);
      expect(result.meta.totalItems).toBe(0);
    });
  });

  describe('getMyTimeEntries', () => {
    it('should return paginated time entries for the current user', async () => {
      timeEntryRepo.findByUser.mockResolvedValue([[mockEntry], 1]);

      const result = await service.getMyTimeEntries(currentUser, {
        page: 1,
        limit: 20,
      });

      expect(timeEntryRepo.findByUser).toHaveBeenCalledWith(
        'user-1',
        expect.objectContaining({}),
        0,
        20,
      );
      expect(result.items).toHaveLength(1);
    });

    it('should pass filters to repository', async () => {
      timeEntryRepo.findByUser.mockResolvedValue([[], 0]);

      await service.getMyTimeEntries(currentUser, {
        page: 1,
        limit: 20,
        taskId: 'task-1',
        isManual: 'true',
        sortBy: 'startTime',
        sortOrder: 'ASC',
      });

      expect(timeEntryRepo.findByUser).toHaveBeenCalledWith(
        'user-1',
        expect.objectContaining({
          taskId: 'task-1',
          isManual: true,
          sortBy: 'startTime',
          sortOrder: 'ASC',
        }),
        0,
        20,
      );
    });
  });

  describe('getActiveTimer', () => {
    it('should return active timer when one exists', async () => {
      const activeEntry = { ...mockEntry, endTime: null, durationSeconds: null };
      timeEntryRepo.findActiveByUser.mockResolvedValue(activeEntry);

      const result = await service.getActiveTimer(currentUser);

      expect(result).toEqual(activeEntry);
      expect(timeEntryRepo.findActiveByUser).toHaveBeenCalledWith('user-1');
    });

    it('should return null when no active timer', async () => {
      timeEntryRepo.findActiveByUser.mockResolvedValue(null);

      const result = await service.getActiveTimer(currentUser);

      expect(result).toBeNull();
    });
  });

  describe('createManualEntry', () => {
    it('should create a manual time entry when user is assigned', async () => {
      taskAssigneeRepo.findOne.mockResolvedValue({ id: 'assignment-1' });

      const result = await service.createManualEntry(
        {
          taskId: 'task-1',
          startTime: '2026-02-09T08:00:00Z',
          endTime: '2026-02-09T10:00:00Z',
          description: 'Manual work',
        },
        currentUser,
      );

      expect(result.isManual).toBe(true);
      expect(result.durationSeconds).toBe(7200);
      expect(result.description).toBe('Manual work');
      expect(result.taskId).toBe('task-1');
      expect(result.userId).toBe('user-1');
    });

    it('should create a manual time entry when user is manager', async () => {
      taskAssigneeRepo.findOne.mockResolvedValue(null);

      const result = await service.createManualEntry(
        {
          taskId: 'task-1',
          startTime: '2026-02-09T08:00:00Z',
          endTime: '2026-02-09T10:00:00Z',
        },
        managerUser,
      );

      expect(result.isManual).toBe(true);
      expect(result.userId).toBe('user-2');
    });

    it('should throw ForbiddenException when user not assigned and not manager', async () => {
      taskAssigneeRepo.findOne.mockResolvedValue(null);

      await expect(
        service.createManualEntry(
          {
            taskId: 'task-1',
            startTime: '2026-02-09T08:00:00Z',
            endTime: '2026-02-09T10:00:00Z',
          },
          currentUser,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException when endTime is before startTime', async () => {
      taskAssigneeRepo.findOne.mockResolvedValue({ id: 'assignment-1' });

      await expect(
        service.createManualEntry(
          {
            taskId: 'task-1',
            startTime: '2026-02-09T10:00:00Z',
            endTime: '2026-02-09T08:00:00Z',
          },
          currentUser,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when endTime equals startTime', async () => {
      taskAssigneeRepo.findOne.mockResolvedValue({ id: 'assignment-1' });

      await expect(
        service.createManualEntry(
          {
            taskId: 'task-1',
            startTime: '2026-02-09T08:00:00Z',
            endTime: '2026-02-09T08:00:00Z',
          },
          currentUser,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('updateEntry', () => {
    it('should update own time entry', async () => {
      timeEntryRepo.findById.mockResolvedValue({ ...mockEntry });
      timeEntryRepo.save.mockImplementation((e: any) => ({ ...e }));

      const result = await service.updateEntry(
        'entry-1',
        { description: 'Updated description' },
        currentUser,
      );

      expect(result.description).toBe('Updated description');
    });

    it('should recompute duration when times change', async () => {
      timeEntryRepo.findById.mockResolvedValue({ ...mockEntry });
      timeEntryRepo.save.mockImplementation((e: any) => ({ ...e }));

      const result = await service.updateEntry(
        'entry-1',
        {
          startTime: '2026-02-09T08:00:00Z',
          endTime: '2026-02-09T09:00:00Z',
        },
        currentUser,
      );

      expect(result.durationSeconds).toBe(3600);
    });

    it('should throw ForbiddenException when updating another user entry', async () => {
      timeEntryRepo.findById.mockResolvedValue({
        ...mockEntry,
        userId: 'other-user',
      });

      await expect(
        service.updateEntry(
          'entry-1',
          { description: 'Hacked' },
          currentUser,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException when entry not found', async () => {
      timeEntryRepo.findById.mockResolvedValue(null);

      await expect(
        service.updateEntry(
          'nonexistent',
          { description: 'test' },
          currentUser,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when endTime is before startTime after update', async () => {
      timeEntryRepo.findById.mockResolvedValue({ ...mockEntry });

      await expect(
        service.updateEntry(
          'entry-1',
          {
            startTime: '2026-02-09T12:00:00Z',
            endTime: '2026-02-09T08:00:00Z',
          },
          currentUser,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('deleteEntry', () => {
    it('should delete own time entry', async () => {
      timeEntryRepo.findById.mockResolvedValue({ ...mockEntry });

      await service.deleteEntry('entry-1', currentUser);

      expect(timeEntryRepo.remove).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'entry-1' }),
      );
    });

    it('should allow manager to delete any time entry', async () => {
      timeEntryRepo.findById.mockResolvedValue({
        ...mockEntry,
        userId: 'other-user',
      });

      await service.deleteEntry('entry-1', managerUser);

      expect(timeEntryRepo.remove).toHaveBeenCalled();
    });

    it('should throw ForbiddenException when non-manager deletes another user entry', async () => {
      timeEntryRepo.findById.mockResolvedValue({
        ...mockEntry,
        userId: 'other-user',
      });

      await expect(
        service.deleteEntry('entry-1', currentUser),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException when entry not found', async () => {
      timeEntryRepo.findById.mockResolvedValue(null);

      await expect(
        service.deleteEntry('nonexistent', currentUser),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getProjectTimeReport', () => {
    it('should return aggregated time report for manager', async () => {
      const reportRows = [
        { taskId: 'task-1', taskTitle: 'Design', totalSeconds: 7200, entryCount: 3 },
        { taskId: 'task-2', taskTitle: 'Review', totalSeconds: 3600, entryCount: 1 },
      ];
      timeEntryRepo.getProjectTimeReport.mockResolvedValue(reportRows);

      const result = await service.getProjectTimeReport('project-1', managerUser);

      expect(result.tasks).toHaveLength(2);
      expect(result.totalSeconds).toBe(10800);
      expect(timeEntryRepo.getProjectTimeReport).toHaveBeenCalledWith('project-1');
    });

    it('should throw ForbiddenException for non-manager', async () => {
      await expect(
        service.getProjectTimeReport('project-1', currentUser),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should return empty report when no entries exist', async () => {
      timeEntryRepo.getProjectTimeReport.mockResolvedValue([]);

      const result = await service.getProjectTimeReport('project-1', managerUser);

      expect(result.tasks).toHaveLength(0);
      expect(result.totalSeconds).toBe(0);
    });
  });
});
