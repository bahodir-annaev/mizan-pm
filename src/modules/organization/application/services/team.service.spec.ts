import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { getRepositoryToken } from '@nestjs/typeorm';
import { TeamService } from './team.service';
import { Team } from '../../domain/entities/team.entity';
import { TeamMembership } from '../../domain/entities/team-membership.entity';
import { TeamRole } from '../../domain/entities/team-role.enum';
import { TEAM_REPOSITORY } from '../../domain/repositories/team-repository.interface';
import { USER_REPOSITORY } from '../../../identity/domain/repositories/user-repository.interface';

describe('TeamService', () => {
  let service: TeamService;
  let teamRepo: any;
  let userRepo: any;
  let membershipRepo: any;
  let eventEmitter: any;

  const adminUser = { id: 'admin-1', roles: ['admin'] };
  const managerUser = { id: 'manager-1', roles: ['manager'] };
  const memberUser = { id: 'member-1', roles: ['member'] };

  const mockTeam: Partial<Team> = {
    id: 'team-1',
    name: 'Design Team',
    description: 'Architecture design team',
    createdBy: 'admin-1',
    memberships: [],
  };

  beforeEach(async () => {
    teamRepo = {
      findById: jest.fn(),
      findAll: jest.fn(),
      findByUserId: jest.fn(),
      save: jest.fn().mockImplementation((team: any) => ({
        id: 'team-1',
        ...team,
      })),
      softDelete: jest.fn(),
    };

    userRepo = {
      findById: jest.fn(),
      findByEmail: jest.fn(),
      findAll: jest.fn(),
      save: jest.fn(),
      softDelete: jest.fn(),
    };

    membershipRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn().mockImplementation((m: any) => ({
        id: 'membership-1',
        ...m,
      })),
      remove: jest.fn(),
    };

    eventEmitter = {
      emit: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TeamService,
        { provide: TEAM_REPOSITORY, useValue: teamRepo },
        { provide: USER_REPOSITORY, useValue: userRepo },
        { provide: getRepositoryToken(TeamMembership), useValue: membershipRepo },
        { provide: EventEmitter2, useValue: eventEmitter },
      ],
    }).compile();

    service = module.get<TeamService>(TeamService);
  });

  describe('create', () => {
    it('should create a team and add creator as owner', async () => {
      teamRepo.findById.mockResolvedValue({ ...mockTeam, id: 'team-1' });

      const result = await service.create(
        { name: 'Design Team', description: 'Architecture design team' },
        adminUser,
      );

      expect(teamRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Design Team',
          createdBy: 'admin-1',
        }),
      );
      expect(membershipRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          teamId: 'team-1',
          userId: 'admin-1',
          teamRole: TeamRole.OWNER,
        }),
      );
      expect(result).toBeDefined();
    });
  });

  describe('findAll', () => {
    it('should return all teams for admin users', async () => {
      teamRepo.findAll.mockResolvedValue([[mockTeam], 1]);

      const result = await service.findAll({ page: 1, limit: 20 }, adminUser);

      expect(teamRepo.findAll).toHaveBeenCalledWith(0, 20);
      expect(result.items).toHaveLength(1);
      expect(result.meta.totalItems).toBe(1);
    });

    it('should return only member teams for non-admin users', async () => {
      teamRepo.findByUserId.mockResolvedValue([[mockTeam], 1]);

      const result = await service.findAll({ page: 1, limit: 20 }, memberUser);

      expect(teamRepo.findByUserId).toHaveBeenCalledWith('member-1', 0, 20);
      expect(result.items).toHaveLength(1);
    });
  });

  describe('findById', () => {
    it('should return a team by id', async () => {
      teamRepo.findById.mockResolvedValue(mockTeam);

      const result = await service.findById('team-1');

      expect(result).toEqual(mockTeam);
    });

    it('should throw NotFoundException if team not found', async () => {
      teamRepo.findById.mockResolvedValue(null);

      await expect(service.findById('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should update team when user is admin', async () => {
      teamRepo.findById.mockResolvedValue(mockTeam);
      teamRepo.save.mockResolvedValue({ ...mockTeam, name: 'Updated Team' });

      const result = await service.update(
        'team-1',
        { name: 'Updated Team' },
        adminUser,
      );

      expect(teamRepo.save).toHaveBeenCalled();
    });

    it('should update team when user is team owner', async () => {
      teamRepo.findById.mockResolvedValue(mockTeam);
      membershipRepo.findOne.mockResolvedValue({
        teamRole: TeamRole.OWNER,
      });
      teamRepo.save.mockResolvedValue({ ...mockTeam, name: 'Updated Team' });

      const result = await service.update(
        'team-1',
        { name: 'Updated Team' },
        managerUser,
      );

      expect(teamRepo.save).toHaveBeenCalled();
    });

    it('should throw ForbiddenException when member tries to update', async () => {
      teamRepo.findById.mockResolvedValue(mockTeam);
      membershipRepo.findOne.mockResolvedValue({
        teamRole: TeamRole.MEMBER,
      });

      await expect(
        service.update('team-1', { name: 'Hacked' }, memberUser),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('softDelete', () => {
    it('should soft delete when user is admin', async () => {
      teamRepo.findById.mockResolvedValue(mockTeam);

      await service.softDelete('team-1', adminUser);

      expect(teamRepo.softDelete).toHaveBeenCalledWith('team-1');
    });

    it('should throw ForbiddenException when non-admin tries to delete', async () => {
      teamRepo.findById.mockResolvedValue(mockTeam);

      await expect(
        service.softDelete('team-1', memberUser),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('addMember', () => {
    it('should add a member to the team', async () => {
      teamRepo.findById.mockResolvedValue(mockTeam);
      membershipRepo.findOne
        .mockResolvedValueOnce({ teamRole: TeamRole.OWNER }) // assertTeamManagerOrAdmin
        .mockResolvedValueOnce(null); // check existing membership
      userRepo.findById.mockResolvedValue({ id: 'new-user' });

      const result = await service.addMember(
        'team-1',
        { userId: 'new-user', teamRole: TeamRole.MEMBER },
        managerUser,
      );

      expect(membershipRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          teamId: 'team-1',
          userId: 'new-user',
          teamRole: TeamRole.MEMBER,
        }),
      );
    });

    it('should throw NotFoundException when target user does not exist', async () => {
      teamRepo.findById.mockResolvedValue(mockTeam);
      membershipRepo.findOne.mockResolvedValueOnce({
        teamRole: TeamRole.OWNER,
      });
      userRepo.findById.mockResolvedValue(null);

      await expect(
        service.addMember(
          'team-1',
          { userId: 'nonexistent' },
          managerUser,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException when user is already a member', async () => {
      teamRepo.findById.mockResolvedValue(mockTeam);
      membershipRepo.findOne
        .mockResolvedValueOnce({ teamRole: TeamRole.OWNER }) // assertTeamManagerOrAdmin
        .mockResolvedValueOnce({ id: 'existing' }); // existing membership
      userRepo.findById.mockResolvedValue({ id: 'existing-user' });

      await expect(
        service.addMember(
          'team-1',
          { userId: 'existing-user' },
          managerUser,
        ),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('updateMemberRole', () => {
    it('should update the member role', async () => {
      teamRepo.findById.mockResolvedValue(mockTeam);
      membershipRepo.findOne
        .mockResolvedValueOnce({ teamRole: TeamRole.OWNER }) // assertTeamManagerOrAdmin
        .mockResolvedValueOnce({ // target membership
          id: 'membership-1',
          teamRole: TeamRole.MEMBER,
        });
      membershipRepo.save.mockResolvedValue({
        id: 'membership-1',
        teamRole: TeamRole.ADMIN,
      });

      const result = await service.updateMemberRole(
        'team-1',
        'member-1',
        { teamRole: TeamRole.ADMIN },
        managerUser,
      );

      expect(membershipRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ teamRole: TeamRole.ADMIN }),
      );
    });

    it('should throw NotFoundException when membership not found', async () => {
      teamRepo.findById.mockResolvedValue(mockTeam);
      membershipRepo.findOne
        .mockResolvedValueOnce({ teamRole: TeamRole.OWNER })
        .mockResolvedValueOnce(null);

      await expect(
        service.updateMemberRole(
          'team-1',
          'nonexistent',
          { teamRole: TeamRole.ADMIN },
          managerUser,
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('removeMember', () => {
    it('should remove a member from the team', async () => {
      teamRepo.findById.mockResolvedValue(mockTeam);
      const membership = { id: 'membership-1' };
      membershipRepo.findOne
        .mockResolvedValueOnce({ teamRole: TeamRole.OWNER })
        .mockResolvedValueOnce(membership);

      await service.removeMember('team-1', 'member-1', managerUser);

      expect(membershipRepo.remove).toHaveBeenCalledWith(membership);
    });

    it('should throw NotFoundException when membership not found', async () => {
      teamRepo.findById.mockResolvedValue(mockTeam);
      membershipRepo.findOne
        .mockResolvedValueOnce({ teamRole: TeamRole.OWNER })
        .mockResolvedValueOnce(null);

      await expect(
        service.removeMember('team-1', 'nonexistent', managerUser),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('isTeamManager', () => {
    it('should return true for team owner', async () => {
      membershipRepo.findOne.mockResolvedValue({ teamRole: TeamRole.OWNER });

      const result = await service.isTeamManager('team-1', 'user-1');

      expect(result).toBe(true);
    });

    it('should return true for team admin', async () => {
      membershipRepo.findOne.mockResolvedValue({ teamRole: TeamRole.ADMIN });

      const result = await service.isTeamManager('team-1', 'user-1');

      expect(result).toBe(true);
    });

    it('should return false for regular member', async () => {
      membershipRepo.findOne.mockResolvedValue({ teamRole: TeamRole.MEMBER });

      const result = await service.isTeamManager('team-1', 'user-1');

      expect(result).toBe(false);
    });

    it('should return false when not a member', async () => {
      membershipRepo.findOne.mockResolvedValue(null);

      const result = await service.isTeamManager('team-1', 'user-1');

      expect(result).toBe(false);
    });
  });
});
