import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository, SelectQueryBuilder } from 'typeorm';
import { Project } from '../../domain/entities/project.entity';
import {
  IProjectRepository,
  ProjectFilterParams,
} from '../../domain/repositories/project-repository.interface';

const ALLOWED_SORT_COLUMNS: Record<string, string> = {
  name: 'project.name',
  createdAt: 'project.createdAt',
  status: 'project.status',
  startDate: 'project.startDate',
  dueDate: 'project.dueDate',
};

@Injectable()
export class TypeOrmProjectRepository implements IProjectRepository {
  constructor(
    @InjectRepository(Project)
    private readonly repo: Repository<Project>,
  ) {}

  async findById(id: string): Promise<Project | null> {
    return this.repo.findOne({
      where: { id },
      relations: ['team', 'creator'],
    });
  }

  async findAll(
    skip: number,
    take: number,
    filters?: ProjectFilterParams,
  ): Promise<[Project[], number]> {
    const qb = this.repo
      .createQueryBuilder('project')
      .leftJoinAndSelect('project.team', 'team')
      .leftJoinAndSelect('project.creator', 'creator')
      .where('project.deletedAt IS NULL');

    this.applyFilters(qb, filters);
    this.applySorting(qb, filters);

    qb.skip(skip).take(take);
    return qb.getManyAndCount();
  }

  async findByTeamIds(
    teamIds: string[],
    skip: number,
    take: number,
    filters?: ProjectFilterParams,
  ): Promise<[Project[], number]> {
    if (teamIds.length === 0) {
      return [[], 0];
    }

    const qb = this.repo
      .createQueryBuilder('project')
      .leftJoinAndSelect('project.team', 'team')
      .leftJoinAndSelect('project.creator', 'creator')
      .where('project.teamId IN (:...teamIds)', { teamIds })
      .andWhere('project.deletedAt IS NULL');

    this.applyFilters(qb, filters);
    this.applySorting(qb, filters);

    qb.skip(skip).take(take);
    return qb.getManyAndCount();
  }

  async save(project: Project): Promise<Project> {
    return this.repo.save(project);
  }

  async softDelete(id: string): Promise<void> {
    await this.repo.softDelete(id);
  }

  private applyFilters(
    qb: SelectQueryBuilder<Project>,
    filters?: ProjectFilterParams,
  ): void {
    if (!filters) return;

    if (filters.status) {
      qb.andWhere('project.status = :status', { status: filters.status });
    }

    if (filters.teamId) {
      qb.andWhere('project.teamId = :filterTeamId', {
        filterTeamId: filters.teamId,
      });
    }

    if (filters.search) {
      qb.andWhere(
        '(project.name ILIKE :search OR project.description ILIKE :search)',
        { search: `%${filters.search}%` },
      );
    }
  }

  private applySorting(
    qb: SelectQueryBuilder<Project>,
    filters?: ProjectFilterParams,
  ): void {
    if (filters?.sortBy && ALLOWED_SORT_COLUMNS[filters.sortBy]) {
      const order = filters.sortOrder === 'ASC' ? 'ASC' : 'DESC';
      qb.orderBy(ALLOWED_SORT_COLUMNS[filters.sortBy], order);
    } else {
      qb.orderBy('project.createdAt', 'DESC');
    }
  }
}
