import {
  Injectable,
  Inject,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Repository } from 'typeorm';
import { Team } from '../../domain/entities/team.entity';
import { TeamMembership } from '../../domain/entities/team-membership.entity';
import { TeamRole } from '../../domain/entities/team-role.enum';
import {
  ITeamRepository,
  TEAM_REPOSITORY,
} from '../../domain/repositories/team-repository.interface';
import {
  IUserRepository,
  USER_REPOSITORY,
} from '../../../identity/domain/repositories/user-repository.interface';
import { CreateTeamDto } from '../dtos/create-team.dto';
import { UpdateTeamDto } from '../dtos/update-team.dto';
import { AddTeamMemberDto } from '../dtos/add-team-member.dto';
import { UpdateTeamMemberRoleDto } from '../dtos/update-team-member-role.dto';
import {
  PaginationQueryDto,
  PaginatedResult,
  PaginationMeta,
} from '../../../../shared/application/pagination.dto';

interface CurrentUser {
  id: string;
  roles: string[];
}

const ADMIN_ROLES = ['admin', 'owner'];

@Injectable()
export class TeamService {
  constructor(
    @Inject(TEAM_REPOSITORY)
    private readonly teamRepository: ITeamRepository,
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
    @InjectRepository(TeamMembership)
    private readonly membershipRepo: Repository<TeamMembership>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async create(dto: CreateTeamDto, currentUser: CurrentUser): Promise<Team> {
    const team = new Team();
    team.name = dto.name;
    team.description = dto.description ?? null;
    team.createdBy = currentUser.id;

    const savedTeam = await this.teamRepository.save(team);

    // Creator is automatically added as team owner
    const membership = new TeamMembership();
    membership.teamId = savedTeam.id;
    membership.userId = currentUser.id;
    membership.teamRole = TeamRole.OWNER;
    await this.membershipRepo.save(membership);

    const result = await this.teamRepository.findById(savedTeam.id);
    this.eventEmitter.emit('team.created', {
      team: result,
      actorId: currentUser.id,
    });
    return result;
  }

  async findAll(
    query: PaginationQueryDto,
    currentUser: CurrentUser,
  ): Promise<PaginatedResult<Team>> {
    const skip = (query.page - 1) * query.limit;
    const isAdmin = currentUser.roles.some((r) => ADMIN_ROLES.includes(r));

    const [teams, total] = isAdmin
      ? await this.teamRepository.findAll(skip, query.limit)
      : await this.teamRepository.findByUserId(currentUser.id, skip, query.limit);

    return new PaginatedResult(
      teams,
      new PaginationMeta(query.page, query.limit, total),
    );
  }

  async findById(id: string): Promise<Team> {
    const team = await this.teamRepository.findById(id);
    if (!team) {
      throw new NotFoundException('Team not found');
    }
    return team;
  }

  async update(
    id: string,
    dto: UpdateTeamDto,
    currentUser: CurrentUser,
  ): Promise<Team> {
    const team = await this.findById(id);
    await this.assertTeamManagerOrAdmin(id, currentUser);

    if (dto.name !== undefined) team.name = dto.name;
    if (dto.description !== undefined) team.description = dto.description;

    const saved = await this.teamRepository.save(team);
    this.eventEmitter.emit('team.updated', {
      team: saved,
      actorId: currentUser.id,
      changes: dto,
    });
    return saved;
  }

  async softDelete(id: string, currentUser: CurrentUser): Promise<void> {
    await this.findById(id); // ensure exists
    this.assertAdmin(currentUser);
    await this.teamRepository.softDelete(id);
    this.eventEmitter.emit('team.deleted', {
      teamId: id,
      actorId: currentUser.id,
    });
  }

  // --- Membership management ---

  async getMembers(teamId: string): Promise<TeamMembership[]> {
    await this.findById(teamId); // ensure team exists
    return this.membershipRepo.find({
      where: { teamId },
      relations: ['user'],
      order: { joinedAt: 'ASC' },
    });
  }

  async addMember(
    teamId: string,
    dto: AddTeamMemberDto,
    currentUser: CurrentUser,
  ): Promise<TeamMembership> {
    await this.findById(teamId);
    await this.assertTeamManagerOrAdmin(teamId, currentUser);

    // Verify the target user exists
    const user = await this.userRepository.findById(dto.userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if already a member
    const existing = await this.membershipRepo.findOne({
      where: { teamId, userId: dto.userId },
    });
    if (existing) {
      throw new ConflictException('User is already a member of this team');
    }

    const membership = new TeamMembership();
    membership.teamId = teamId;
    membership.userId = dto.userId;
    membership.teamRole = dto.teamRole ?? TeamRole.MEMBER;

    const saved = await this.membershipRepo.save(membership);
    this.eventEmitter.emit('team.member_added', {
      teamId,
      userId: dto.userId,
      actorId: currentUser.id,
    });
    return saved;
  }

  async updateMemberRole(
    teamId: string,
    userId: string,
    dto: UpdateTeamMemberRoleDto,
    currentUser: CurrentUser,
  ): Promise<TeamMembership> {
    await this.findById(teamId);
    await this.assertTeamManagerOrAdmin(teamId, currentUser);

    const membership = await this.membershipRepo.findOne({
      where: { teamId, userId },
    });
    if (!membership) {
      throw new NotFoundException('Team membership not found');
    }

    membership.teamRole = dto.teamRole;
    return this.membershipRepo.save(membership);
  }

  async removeMember(
    teamId: string,
    userId: string,
    currentUser: CurrentUser,
  ): Promise<void> {
    await this.findById(teamId);
    await this.assertTeamManagerOrAdmin(teamId, currentUser);

    const membership = await this.membershipRepo.findOne({
      where: { teamId, userId },
    });
    if (!membership) {
      throw new NotFoundException('Team membership not found');
    }

    await this.membershipRepo.remove(membership);
    this.eventEmitter.emit('team.member_removed', {
      teamId,
      userId,
      actorId: currentUser.id,
    });
  }

  // --- Authorization helpers ---

  async isTeamManager(teamId: string, userId: string): Promise<boolean> {
    const membership = await this.membershipRepo.findOne({
      where: { teamId, userId },
    });
    return (
      membership !== null &&
      (membership.teamRole === TeamRole.OWNER ||
        membership.teamRole === TeamRole.ADMIN)
    );
  }

  private async assertTeamManagerOrAdmin(
    teamId: string,
    currentUser: CurrentUser,
  ): Promise<void> {
    const isAdmin = currentUser.roles.some((r) => ADMIN_ROLES.includes(r));
    if (isAdmin) return;

    const isManager = await this.isTeamManager(teamId, currentUser.id);
    if (!isManager) {
      throw new ForbiddenException(
        'You must be a team owner/admin or system admin to perform this action',
      );
    }
  }

  private assertAdmin(currentUser: CurrentUser): void {
    const isAdmin = currentUser.roles.some((r) => ADMIN_ROLES.includes(r));
    if (!isAdmin) {
      throw new ForbiddenException('Only system admins can perform this action');
    }
  }
}
