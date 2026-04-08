import {
  Injectable,
  Inject,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Repository } from 'typeorm';
import { Project } from '../../domain/entities/project.entity';
import { ProjectStatus } from '../../domain/entities/project-status.enum';
import { ProjectMember } from '../../domain/entities/project-member.entity';
import {
  IProjectRepository,
  PROJECT_REPOSITORY,
} from '../../domain/repositories/project-repository.interface';
import { TeamMembership } from '../../../organization/domain/entities/team-membership.entity';
import { TeamService } from '../../../organization/application/services/team.service';
import { CreateProjectDto } from '../dtos/create-project.dto';
import { UpdateProjectDto } from '../dtos/update-project.dto';
import { ProjectFilterDto } from '../dtos/project-filter.dto';
import {
  PaginatedResult,
  PaginationMeta,
} from '../../../../shared/application/pagination.dto';
import { ProjectFilterParams } from '../../domain/repositories/project-repository.interface';

interface CurrentUser {
  id: string;
  roles: string[];
  orgId?: string | null;
}

const ADMIN_ROLES = ['admin', 'owner'];

/** Valid status transitions: from → [allowed destinations] */
const STATUS_TRANSITIONS: Record<ProjectStatus, ProjectStatus[]> = {
  [ProjectStatus.PLANNING]: [ProjectStatus.IN_PROGRESS, ProjectStatus.CANCELLED],
  [ProjectStatus.IN_PROGRESS]: [
    ProjectStatus.ON_HOLD,
    ProjectStatus.COMPLETED,
    ProjectStatus.CANCELLED,
  ],
  [ProjectStatus.ON_HOLD]: [ProjectStatus.IN_PROGRESS, ProjectStatus.COMPLETED, ProjectStatus.CANCELLED],
  [ProjectStatus.COMPLETED]: [ProjectStatus.PLANNING],
  [ProjectStatus.CANCELLED]: [ProjectStatus.IN_PROGRESS, ProjectStatus.ON_HOLD, ProjectStatus.COMPLETED],
};

@Injectable()
export class ProjectService {
  constructor(
    @Inject(PROJECT_REPOSITORY)
    private readonly projectRepository: IProjectRepository,
    @InjectRepository(TeamMembership)
    private readonly membershipRepo: Repository<TeamMembership>,
    @InjectRepository(ProjectMember)
    private readonly projectMemberRepo: Repository<ProjectMember>,
    private readonly teamService: TeamService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async create(
    dto: CreateProjectDto,
    currentUser: CurrentUser,
  ): Promise<Project> {
    // Verify the team exists (if provided)
    if (dto.teamId) {
      await this.teamService.findById(dto.teamId);
      await this.assertTeamManagerOrAdmin(dto.teamId, currentUser);
    }

    // Auto-generate project code
    const code = await this.generateProjectCode();

    const project = new Project();
    project.name = dto.name;
    project.description = dto.description ?? null;
    project.teamId = dto.teamId ?? null;
    project.clientId = dto.clientId ?? null;
    project.parentId = dto.parentId ?? null;
    project.orgId = currentUser.orgId ?? null;
    project.createdBy = currentUser.id;
    project.code = code;
    project.projectType = dto.projectType ?? null;
    project.size = dto.size ?? null;
    project.complexity = dto.complexity ?? null;
    project.priority = dto.priority ?? null;
    project.areaSqm = dto.areaSqm ?? null;
    project.budget = dto.budget ?? null;
    project.estimatedDuration = dto.estimatedDuration ?? null;
    project.color = dto.color ?? null;
    project.startDate = dto.startDate ? new Date(dto.startDate) : null;
    project.dueDate = dto.dueDate ? new Date(dto.dueDate) : null;

    const saved = await this.projectRepository.save(project);

    // Add creator as project member
    const member = new ProjectMember();
    member.projectId = saved.id;
    member.userId = currentUser.id;
    member.role = 'owner';
    await this.projectMemberRepo.save(member);

    const result = await this.projectRepository.findById(saved.id);
    this.eventEmitter.emit('project.created', {
      project: result,
      actorId: currentUser.id,
    });
    return result;
  }

  async findAll(
    query: ProjectFilterDto,
    currentUser: CurrentUser,
  ): Promise<PaginatedResult<Project>> {
    const skip = (query.page - 1) * query.limit;
    const isAdmin = currentUser.roles.some((r) => ADMIN_ROLES.includes(r));

    const filters: ProjectFilterParams = {
      status: query.status,
      search: query.search,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
    };

    if (isAdmin) {
      if (query.teamId) {
        filters.teamId = query.teamId;
      }
      const [projects, total] = await this.projectRepository.findAll(
        skip,
        query.limit,
        filters,
      );
      return new PaginatedResult(
        projects,
        new PaginationMeta(query.page, query.limit, total),
      );
    }

    // Non-admin: only see projects belonging to teams they're in
    const memberships = await this.membershipRepo.find({
      where: { userId: currentUser.id },
      select: ['teamId'],
    });
    let teamIds = memberships.map((m) => m.teamId);

    // If teamId filter is set, intersect with user's memberships
    if (query.teamId) {
      teamIds = teamIds.includes(query.teamId) ? [query.teamId] : [];
    }

    const [projects, total] = await this.projectRepository.findByTeamIds(
      teamIds,
      skip,
      query.limit,
      filters,
    );

    return new PaginatedResult(
      projects,
      new PaginationMeta(query.page, query.limit, total),
    );
  }

  async findById(id: string): Promise<Project> {
    const project = await this.projectRepository.findById(id);
    if (!project) {
      throw new NotFoundException('Project not found');
    }
    return project;
  }

  async update(
    id: string,
    dto: UpdateProjectDto,
    currentUser: CurrentUser,
  ): Promise<Project> {
    const project = await this.findById(id);
    if (project.teamId) {
      await this.assertTeamManagerOrAdmin(project.teamId, currentUser);
    }

    // Validate status transition if status is being updated
    if (dto.status !== undefined && dto.status !== project.status) {
      this.validateStatusTransition(project.status, dto.status);
    }

    if (dto.name !== undefined) project.name = dto.name;
    if (dto.description !== undefined) project.description = dto.description;
    if (dto.status !== undefined) project.status = dto.status;
    if (dto.projectType !== undefined) project.projectType = dto.projectType;
    if (dto.size !== undefined) project.size = dto.size;
    if (dto.complexity !== undefined) project.complexity = dto.complexity;
    if (dto.priority !== undefined) project.priority = dto.priority;
    if (dto.areaSqm !== undefined) project.areaSqm = dto.areaSqm;
    if (dto.budget !== undefined) project.budget = dto.budget;
    if (dto.progress !== undefined) project.progress = dto.progress;
    if (dto.estimatedDuration !== undefined) project.estimatedDuration = dto.estimatedDuration;
    if (dto.color !== undefined) project.color = dto.color;
    if (dto.clientId !== undefined) project.clientId = dto.clientId;
    if (dto.startDate !== undefined)
      project.startDate = dto.startDate ? new Date(dto.startDate) : null;
    if (dto.dueDate !== undefined)
      project.dueDate = dto.dueDate ? new Date(dto.dueDate) : null;

    const saved = await this.projectRepository.save(project);
    this.eventEmitter.emit('project.updated', {
      project: saved,
      actorId: currentUser.id,
      changes: dto,
    });
    return saved;
  }

  async softDelete(id: string, currentUser: CurrentUser): Promise<void> {
    const project = await this.findById(id);
    if (project.teamId) {
      await this.assertTeamManagerOrAdmin(project.teamId, currentUser);
    }

    // Archive instead of soft delete
    project.isArchived = true;
    await this.projectRepository.save(project);

    this.eventEmitter.emit('project.deleted', {
      projectId: id,
      actorId: currentUser.id,
    });
  }

  async togglePin(id: string, currentUser: CurrentUser): Promise<Project> {
    const project = await this.findById(id);
    project.isPinned = !project.isPinned;
    return this.projectRepository.save(project);
  }

  // --- Project Members ---

  async getMembers(projectId: string): Promise<ProjectMember[]> {
    await this.findById(projectId);
    return this.projectMemberRepo.find({
      where: { projectId },
      relations: ['user'],
      order: { joinedAt: 'ASC' },
    });
  }

  async addMember(projectId: string, userId: string, role = 'member'): Promise<ProjectMember> {
    await this.findById(projectId);
    const existing = await this.projectMemberRepo.findOne({
      where: { projectId, userId },
    });
    if (existing) {
      throw new BadRequestException('User is already a project member');
    }

    const member = new ProjectMember();
    member.projectId = projectId;
    member.userId = userId;
    member.role = role;
    return this.projectMemberRepo.save(member);
  }

  async removeMember(projectId: string, userId: string): Promise<void> {
    const member = await this.projectMemberRepo.findOne({
      where: { projectId, userId },
    });
    if (!member) {
      throw new NotFoundException('Project membership not found');
    }
    await this.projectMemberRepo.remove(member);
  }

  private validateStatusTransition(
    currentStatus: ProjectStatus,
    newStatus: ProjectStatus,
  ): void {
    const allowed = STATUS_TRANSITIONS[currentStatus];
    if (!allowed || !allowed.includes(newStatus)) {
      throw new BadRequestException(
        `Invalid status transition from '${currentStatus}' to '${newStatus}'`,
      );
    }
  }

  private async assertTeamManagerOrAdmin(
    teamId: string | null,
    currentUser: CurrentUser,
  ): Promise<void> {
    const isAdmin = currentUser.roles.some((r) => ADMIN_ROLES.includes(r));
    if (isAdmin) return;

    if (!teamId) return; // No team restriction

    const isManager = await this.teamService.isTeamManager(
      teamId,
      currentUser.id,
    );
    if (!isManager) {
      throw new ForbiddenException(
        'You must be a team owner/admin or system admin to manage projects',
      );
    }
  }

  private async generateProjectCode(): Promise<string> {
    const result = await this.projectMemberRepo.manager
      .createQueryBuilder()
      .select('COUNT(*)', 'count')
      .from('projects', 'p')
      .getRawOne();
    const count = parseInt(result?.count || '0', 10) + 1;
    return `PRJ-${count.toString().padStart(3, '0')}`;
  }
}
