import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository, SelectQueryBuilder } from 'typeorm';
import { TimeEntry } from '../../domain/entities/time-entry.entity';
import {
  ITimeEntryRepository,
  TimeEntryFilterParams,
  ProjectTimeReportRow,
} from '../../domain/repositories/time-entry-repository.interface';

const ALLOWED_SORT_COLUMNS: Record<string, string> = {
  startTime: 'entry.startTime',
  endTime: 'entry.endTime',
  durationSeconds: 'entry.durationSeconds',
  createdAt: 'entry.createdAt',
};

@Injectable()
export class TypeOrmTimeEntryRepository implements ITimeEntryRepository {
  constructor(
    @InjectRepository(TimeEntry)
    private readonly repo: Repository<TimeEntry>,
  ) {}

  async findById(id: string, relations?: string[]): Promise<TimeEntry | null> {
    return this.repo.findOne({
      where: { id },
      relations: relations || [],
    });
  }

  async findActiveByUser(userId: string): Promise<TimeEntry | null> {
    return this.repo.findOne({
      where: { userId, endTime: IsNull() },
    });
  }

  async findActiveByUserAndTask(userId: string, taskId: string): Promise<TimeEntry | null> {
    return this.repo.findOne({
      where: { userId, taskId, endTime: IsNull() },
    });
  }

  async findAllActive(): Promise<TimeEntry[]> {
    return this.repo.find({
      where: { endTime: IsNull() },
      relations: ['user', 'task'],
      order: { startTime: 'ASC' },
    });
  }

  async save(entry: TimeEntry): Promise<TimeEntry> {
    return this.repo.save(entry);
  }

  async remove(entry: TimeEntry): Promise<void> {
    await this.repo.remove(entry);
  }

  async findByTask(
    taskId: string,
    skip: number,
    take: number,
  ): Promise<[TimeEntry[], number]> {
    return this.repo.findAndCount({
      where: { taskId },
      relations: ['user'],
      order: { startTime: 'DESC' },
      skip,
      take,
    });
  }

  async findByUser(
    userId: string,
    filters: TimeEntryFilterParams,
    skip: number,
    take: number,
  ): Promise<[TimeEntry[], number]> {
    const qb = this.repo
      .createQueryBuilder('entry')
      .leftJoinAndSelect('entry.task', 'task')
      .where('entry.userId = :userId', { userId });

    this.applyFilters(qb, filters);
    this.applySorting(qb, filters);

    qb.skip(skip).take(take);
    return qb.getManyAndCount();
  }

  async getProjectTimeReport(projectId: string): Promise<ProjectTimeReportRow[]> {
    const rows = await this.repo
      .createQueryBuilder('entry')
      .innerJoin('entry.task', 'task')
      .select('task.id', 'taskId')
      .addSelect('task.title', 'taskTitle')
      .addSelect('COALESCE(SUM(entry.durationSeconds), 0)', 'totalSeconds')
      .addSelect('COUNT(entry.id)', 'entryCount')
      .where('task.projectId = :projectId', { projectId })
      .andWhere('entry.endTime IS NOT NULL')
      .groupBy('task.id')
      .addGroupBy('task.title')
      .orderBy('"totalSeconds"', 'DESC')
      .getRawMany();

    return rows.map((r) => ({
      taskId: r.taskId,
      taskTitle: r.taskTitle,
      totalSeconds: Number(r.totalSeconds),
      entryCount: Number(r.entryCount),
    }));
  }

  private applyFilters(
    qb: SelectQueryBuilder<TimeEntry>,
    filters: TimeEntryFilterParams,
  ): void {
    if (filters.taskId) {
      qb.andWhere('entry.taskId = :taskId', { taskId: filters.taskId });
    }

    if (filters.startDate) {
      qb.andWhere('entry.startTime >= :startDate', { startDate: filters.startDate });
    }

    if (filters.endDate) {
      qb.andWhere('entry.startTime <= :endDate', { endDate: filters.endDate });
    }

    if (filters.isManual !== undefined) {
      qb.andWhere('entry.isManual = :isManual', { isManual: filters.isManual });
    }
  }

  private applySorting(
    qb: SelectQueryBuilder<TimeEntry>,
    filters: TimeEntryFilterParams,
  ): void {
    if (filters.sortBy && ALLOWED_SORT_COLUMNS[filters.sortBy]) {
      const order = filters.sortOrder === 'ASC' ? 'ASC' : 'DESC';
      qb.orderBy(ALLOWED_SORT_COLUMNS[filters.sortBy], order);
    } else {
      qb.orderBy('entry.startTime', 'DESC');
    }
  }
}
