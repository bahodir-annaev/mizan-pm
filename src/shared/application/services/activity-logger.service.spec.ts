import { Test, TestingModule } from '@nestjs/testing';
import { ActivityLoggerService } from './activity-logger.service';
import { ActivityLog } from '../../domain/entities/activity-log.entity';
import { ACTIVITY_LOG_REPOSITORY } from '../../domain/repositories/activity-log-repository.interface';

describe('ActivityLoggerService', () => {
  let service: ActivityLoggerService;
  let repo: any;

  beforeEach(async () => {
    repo = {
      save: jest.fn().mockImplementation((entry: any) => ({
        id: 'log-1',
        ...entry,
        createdAt: new Date(),
      })),
      findByEntity: jest.fn(),
      findByProject: jest.fn(),
      findAll: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ActivityLoggerService,
        { provide: ACTIVITY_LOG_REPOSITORY, useValue: repo },
      ],
    }).compile();

    service = module.get<ActivityLoggerService>(ActivityLoggerService);
  });

  describe('log', () => {
    it('should create and persist an activity log entry', async () => {
      const result = await service.log(
        'user-1',
        'created',
        'project',
        'project-1',
        { name: 'New Project' },
      );

      expect(repo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          actorId: 'user-1',
          action: 'created',
          entityType: 'project',
          entityId: 'project-1',
          metadata: { name: 'New Project' },
        }),
      );
      expect(result.id).toBe('log-1');
    });

    it('should persist with null metadata when not provided', async () => {
      await service.log('user-1', 'deleted', 'task', 'task-1');

      expect(repo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: null,
        }),
      );
    });
  });

  describe('getEntityActivity', () => {
    it('should return paginated activity for an entity', async () => {
      const mockLogs = [
        { id: 'log-1', action: 'created', entityType: 'task', entityId: 'task-1' },
        { id: 'log-2', action: 'updated', entityType: 'task', entityId: 'task-1' },
      ];
      repo.findByEntity.mockResolvedValue([mockLogs, 2]);

      const result = await service.getEntityActivity('task', 'task-1', {
        page: 1,
        limit: 20,
      });

      expect(repo.findByEntity).toHaveBeenCalledWith('task', 'task-1', 0, 20);
      expect(result.items).toHaveLength(2);
      expect(result.meta.totalItems).toBe(2);
    });

    it('should return empty result when no activity exists', async () => {
      repo.findByEntity.mockResolvedValue([[], 0]);

      const result = await service.getEntityActivity('task', 'task-1', {
        page: 1,
        limit: 20,
      });

      expect(result.items).toHaveLength(0);
      expect(result.meta.totalItems).toBe(0);
    });

    it('should compute correct skip value for page 2', async () => {
      repo.findByEntity.mockResolvedValue([[], 0]);

      await service.getEntityActivity('task', 'task-1', {
        page: 2,
        limit: 10,
      });

      expect(repo.findByEntity).toHaveBeenCalledWith('task', 'task-1', 10, 10);
    });
  });

  describe('getProjectActivity', () => {
    it('should return paginated activity for a project', async () => {
      const mockLogs = [
        { id: 'log-1', action: 'created', entityType: 'project', entityId: 'project-1' },
      ];
      repo.findByProject.mockResolvedValue([mockLogs, 1]);

      const result = await service.getProjectActivity('project-1', {
        page: 1,
        limit: 20,
      });

      expect(repo.findByProject).toHaveBeenCalledWith('project-1', 0, 20);
      expect(result.items).toHaveLength(1);
      expect(result.meta.totalItems).toBe(1);
    });

    it('should return empty result for project with no activity', async () => {
      repo.findByProject.mockResolvedValue([[], 0]);

      const result = await service.getProjectActivity('project-1', {
        page: 1,
        limit: 20,
      });

      expect(result.items).toHaveLength(0);
    });
  });

  describe('getGlobalActivity', () => {
    it('should return paginated global activity feed', async () => {
      const mockLogs = [
        { id: 'log-1', action: 'created', entityType: 'project' },
        { id: 'log-2', action: 'created', entityType: 'team' },
        { id: 'log-3', action: 'updated', entityType: 'task' },
      ];
      repo.findAll.mockResolvedValue([mockLogs, 3]);

      const result = await service.getGlobalActivity({ page: 1, limit: 20 });

      expect(repo.findAll).toHaveBeenCalledWith(0, 20);
      expect(result.items).toHaveLength(3);
      expect(result.meta.totalItems).toBe(3);
    });

    it('should return empty result when no activity exists', async () => {
      repo.findAll.mockResolvedValue([[], 0]);

      const result = await service.getGlobalActivity({ page: 1, limit: 20 });

      expect(result.items).toHaveLength(0);
    });
  });
});
