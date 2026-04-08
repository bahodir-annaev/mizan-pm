import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ProjectService } from './project.service';
import { Project } from '../../domain/entities/project.entity';
import { ProjectStatus } from '../../domain/entities/project-status.enum';
import { PROJECT_REPOSITORY } from '../../domain/repositories/project-repository.interface';
import { TeamMembership } from '../../../organization/domain/entities/team-membership.entity';
import { ProjectMember } from '../../domain/entities/project-member.entity';
import { TeamService } from '../../../organization/application/services/team.service';

describe('ProjectService', () => {
  let service: ProjectService;
  let projectRepo: any;
  let membershipRepo: any;
  let projectMemberRepo: any;
  let teamService: any;
  let eventEmitter: any;

  const adminUser = { id: 'admin-1', roles: ['admin'] };
  const managerUser = { id: 'manager-1', roles: ['manager'] };
  const memberUser = { id: 'member-1', roles: ['member'] };

  const mockProject: Partial<Project> = {
    id: 'project-1',
    name: 'Office Building',
    description: 'New office building project',
    status: ProjectStatus.PLANNING,
    teamId: 'team-1',
    createdBy: 'admin-1',
    startDate: null,
    dueDate: null,
  };

  beforeEach(async () => {
    projectRepo = {
      findById: jest.fn(),
      findAll: jest.fn(),
      findByTeamIds: jest.fn(),
      save: jest.fn().mockImplementation((project: any) => ({
        id: 'project-1',
        ...project,
      })),
      softDelete: jest.fn(),
    };

    membershipRepo = {
      find: jest.fn(),
    };

    projectMemberRepo = {
      save: jest.fn().mockImplementation((m: any) => ({ id: 'pm-1', ...m })),
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn().mockResolvedValue(null),
      remove: jest.fn(),
      manager: {
        createQueryBuilder: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnThis(),
          from: jest.fn().mockReturnThis(),
          getRawOne: jest.fn().mockResolvedValue({ count: '0' }),
        }),
      },
    };

    teamService = {
      findById: jest.fn().mockResolvedValue({ id: 'team-1', name: 'Design Team' }),
      isTeamManager: jest.fn(),
    };

    eventEmitter = {
      emit: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectService,
        { provide: PROJECT_REPOSITORY, useValue: projectRepo },
        { provide: getRepositoryToken(TeamMembership), useValue: membershipRepo },
        { provide: getRepositoryToken(ProjectMember), useValue: projectMemberRepo },
        { provide: TeamService, useValue: teamService },
        { provide: EventEmitter2, useValue: eventEmitter },
      ],
    }).compile();

    service = module.get<ProjectService>(ProjectService);
  });

  describe('create', () => {
    it('should create a project when user is admin', async () => {
      projectRepo.findById.mockResolvedValue(mockProject);

      const result = await service.create(
        { name: 'Office Building', teamId: 'team-1' },
        adminUser,
      );

      expect(teamService.findById).toHaveBeenCalledWith('team-1');
      expect(projectRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Office Building',
          teamId: 'team-1',
          createdBy: 'admin-1',
        }),
      );
    });

    it('should create a project when user is team manager', async () => {
      teamService.isTeamManager.mockResolvedValue(true);
      projectRepo.findById.mockResolvedValue(mockProject);

      const result = await service.create(
        { name: 'Office Building', teamId: 'team-1' },
        managerUser,
      );

      expect(projectRepo.save).toHaveBeenCalled();
    });

    it('should throw ForbiddenException when member tries to create', async () => {
      teamService.isTeamManager.mockResolvedValue(false);

      await expect(
        service.create(
          { name: 'Office Building', teamId: 'team-1' },
          memberUser,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException when team does not exist', async () => {
      teamService.findById.mockRejectedValue(
        new NotFoundException('Team not found'),
      );

      await expect(
        service.create(
          { name: 'Office Building', teamId: 'nonexistent' },
          adminUser,
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findAll', () => {
    it('should return all projects for admin users', async () => {
      projectRepo.findAll.mockResolvedValue([[mockProject], 1]);

      const result = await service.findAll({ page: 1, limit: 20 }, adminUser);

      expect(projectRepo.findAll).toHaveBeenCalledWith(0, 20, expect.objectContaining({}));
      expect(result.items).toHaveLength(1);
      expect(result.meta.totalItems).toBe(1);
    });

    it('should return only team-scoped projects for non-admin users', async () => {
      membershipRepo.find.mockResolvedValue([{ teamId: 'team-1' }]);
      projectRepo.findByTeamIds.mockResolvedValue([[mockProject], 1]);

      const result = await service.findAll({ page: 1, limit: 20 }, memberUser);

      expect(membershipRepo.find).toHaveBeenCalledWith({
        where: { userId: 'member-1' },
        select: ['teamId'],
      });
      expect(projectRepo.findByTeamIds).toHaveBeenCalledWith(
        ['team-1'],
        0,
        20,
        expect.objectContaining({}),
      );
      expect(result.items).toHaveLength(1);
    });

    it('should return empty result when non-admin has no teams', async () => {
      membershipRepo.find.mockResolvedValue([]);
      projectRepo.findByTeamIds.mockResolvedValue([[], 0]);

      const result = await service.findAll({ page: 1, limit: 20 }, memberUser);

      expect(result.items).toHaveLength(0);
      expect(result.meta.totalItems).toBe(0);
    });

    it('should pass status filter to repository for admin', async () => {
      projectRepo.findAll.mockResolvedValue([[mockProject], 1]);

      await service.findAll(
        { page: 1, limit: 20, status: ProjectStatus.IN_PROGRESS },
        adminUser,
      );

      expect(projectRepo.findAll).toHaveBeenCalledWith(
        0,
        20,
        expect.objectContaining({ status: ProjectStatus.IN_PROGRESS }),
      );
    });

    it('should pass search filter to repository for admin', async () => {
      projectRepo.findAll.mockResolvedValue([[], 0]);

      await service.findAll(
        { page: 1, limit: 20, search: 'office' },
        adminUser,
      );

      expect(projectRepo.findAll).toHaveBeenCalledWith(
        0,
        20,
        expect.objectContaining({ search: 'office' }),
      );
    });

    it('should pass sort params to repository', async () => {
      projectRepo.findAll.mockResolvedValue([[], 0]);

      await service.findAll(
        { page: 1, limit: 20, sortBy: 'name', sortOrder: 'ASC' },
        adminUser,
      );

      expect(projectRepo.findAll).toHaveBeenCalledWith(
        0,
        20,
        expect.objectContaining({ sortBy: 'name', sortOrder: 'ASC' }),
      );
    });

    it('should pass teamId filter for admin to repository', async () => {
      projectRepo.findAll.mockResolvedValue([[mockProject], 1]);

      await service.findAll(
        { page: 1, limit: 20, teamId: 'team-1' },
        adminUser,
      );

      expect(projectRepo.findAll).toHaveBeenCalledWith(
        0,
        20,
        expect.objectContaining({ teamId: 'team-1' }),
      );
    });

    it('should intersect teamId filter with memberships for non-admin', async () => {
      membershipRepo.find.mockResolvedValue([{ teamId: 'team-1' }, { teamId: 'team-2' }]);
      projectRepo.findByTeamIds.mockResolvedValue([[mockProject], 1]);

      await service.findAll(
        { page: 1, limit: 20, teamId: 'team-1' },
        memberUser,
      );

      expect(projectRepo.findByTeamIds).toHaveBeenCalledWith(
        ['team-1'],
        0,
        20,
        expect.objectContaining({}),
      );
    });

    it('should return empty when non-admin filters by team they are not in', async () => {
      membershipRepo.find.mockResolvedValue([{ teamId: 'team-1' }]);
      projectRepo.findByTeamIds.mockResolvedValue([[], 0]);

      const result = await service.findAll(
        { page: 1, limit: 20, teamId: 'team-99' },
        memberUser,
      );

      expect(projectRepo.findByTeamIds).toHaveBeenCalledWith(
        [],
        0,
        20,
        expect.objectContaining({}),
      );
      expect(result.items).toHaveLength(0);
    });
  });

  describe('findById', () => {
    it('should return a project by id', async () => {
      projectRepo.findById.mockResolvedValue(mockProject);

      const result = await service.findById('project-1');

      expect(result).toEqual(mockProject);
    });

    it('should throw NotFoundException when project not found', async () => {
      projectRepo.findById.mockResolvedValue(null);

      await expect(service.findById('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should update project when user is admin', async () => {
      projectRepo.findById.mockResolvedValue({ ...mockProject });
      projectRepo.save.mockResolvedValue({
        ...mockProject,
        name: 'Updated Project',
      });

      const result = await service.update(
        'project-1',
        { name: 'Updated Project' },
        adminUser,
      );

      expect(projectRepo.save).toHaveBeenCalled();
    });

    it('should update project when user is team manager', async () => {
      projectRepo.findById.mockResolvedValue({ ...mockProject });
      teamService.isTeamManager.mockResolvedValue(true);
      projectRepo.save.mockResolvedValue({
        ...mockProject,
        name: 'Updated Project',
      });

      const result = await service.update(
        'project-1',
        { name: 'Updated Project' },
        managerUser,
      );

      expect(projectRepo.save).toHaveBeenCalled();
    });

    it('should throw ForbiddenException when member tries to update', async () => {
      projectRepo.findById.mockResolvedValue({ ...mockProject });
      teamService.isTeamManager.mockResolvedValue(false);

      await expect(
        service.update(
          'project-1',
          { name: 'Hacked' },
          memberUser,
        ),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('update - status transitions', () => {
    it('should allow valid transition: start → in_progress', async () => {
      projectRepo.findById.mockResolvedValue({
        ...mockProject,
        status: ProjectStatus.PLANNING,
      });
      projectRepo.save.mockImplementation((p: any) => p);

      const result = await service.update(
        'project-1',
        { status: ProjectStatus.IN_PROGRESS },
        adminUser,
      );

      expect(result.status).toBe(ProjectStatus.IN_PROGRESS);
    });

    it('should allow valid transition: in_progress → end', async () => {
      projectRepo.findById.mockResolvedValue({
        ...mockProject,
        status: ProjectStatus.IN_PROGRESS,
      });
      projectRepo.save.mockImplementation((p: any) => p);

      const result = await service.update(
        'project-1',
        { status: ProjectStatus.COMPLETED },
        adminUser,
      );

      expect(result.status).toBe(ProjectStatus.COMPLETED);
    });

    it('should allow valid transition: in_progress → burning', async () => {
      projectRepo.findById.mockResolvedValue({
        ...mockProject,
        status: ProjectStatus.IN_PROGRESS,
      });
      projectRepo.save.mockImplementation((p: any) => p);

      const result = await service.update(
        'project-1',
        { status: ProjectStatus.ON_HOLD },
        adminUser,
      );

      expect(result.status).toBe(ProjectStatus.ON_HOLD);
    });

    it('should allow valid transition: burning → in_progress', async () => {
      projectRepo.findById.mockResolvedValue({
        ...mockProject,
        status: ProjectStatus.ON_HOLD,
      });
      projectRepo.save.mockImplementation((p: any) => p);

      const result = await service.update(
        'project-1',
        { status: ProjectStatus.IN_PROGRESS },
        adminUser,
      );

      expect(result.status).toBe(ProjectStatus.IN_PROGRESS);
    });

    it('should allow valid transition: end → start (reopen)', async () => {
      projectRepo.findById.mockResolvedValue({
        ...mockProject,
        status: ProjectStatus.COMPLETED,
      });
      projectRepo.save.mockImplementation((p: any) => p);

      const result = await service.update(
        'project-1',
        { status: ProjectStatus.PLANNING },
        adminUser,
      );

      expect(result.status).toBe(ProjectStatus.PLANNING);
    });

    it('should reject invalid transition: start → end', async () => {
      projectRepo.findById.mockResolvedValue({
        ...mockProject,
        status: ProjectStatus.PLANNING,
      });

      await expect(
        service.update(
          'project-1',
          { status: ProjectStatus.COMPLETED },
          adminUser,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject invalid transition: start → burning', async () => {
      projectRepo.findById.mockResolvedValue({
        ...mockProject,
        status: ProjectStatus.PLANNING,
      });

      await expect(
        service.update(
          'project-1',
          { status: ProjectStatus.ON_HOLD },
          adminUser,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject invalid transition: end → in_progress', async () => {
      projectRepo.findById.mockResolvedValue({
        ...mockProject,
        status: ProjectStatus.COMPLETED,
      });

      await expect(
        service.update(
          'project-1',
          { status: ProjectStatus.IN_PROGRESS },
          adminUser,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should not validate when status is unchanged', async () => {
      projectRepo.findById.mockResolvedValue({
        ...mockProject,
        status: ProjectStatus.PLANNING,
      });
      projectRepo.save.mockImplementation((p: any) => p);

      const result = await service.update(
        'project-1',
        { status: ProjectStatus.PLANNING },
        adminUser,
      );

      expect(result.status).toBe(ProjectStatus.PLANNING);
    });
  });

  describe('softDelete', () => {
    it('should archive project when user is admin', async () => {
      const project = { ...mockProject };
      projectRepo.findById.mockResolvedValue(project);

      await service.softDelete('project-1', adminUser);

      expect(projectRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ isArchived: true }),
      );
    });

    it('should archive project when user is team manager', async () => {
      const project = { ...mockProject };
      projectRepo.findById.mockResolvedValue(project);
      teamService.isTeamManager.mockResolvedValue(true);

      await service.softDelete('project-1', managerUser);

      expect(projectRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ isArchived: true }),
      );
    });

    it('should throw ForbiddenException when member tries to delete', async () => {
      projectRepo.findById.mockResolvedValue(mockProject);
      teamService.isTeamManager.mockResolvedValue(false);

      await expect(
        service.softDelete('project-1', memberUser),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
