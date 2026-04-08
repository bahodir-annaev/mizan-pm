import { Injectable, Inject } from '@nestjs/common';
import { ActivityLog } from '../../domain/entities/activity-log.entity';
import {
  IActivityLogRepository,
  ACTIVITY_LOG_REPOSITORY,
} from '../../domain/repositories/activity-log-repository.interface';
import {
  PaginatedResult,
  PaginationMeta,
  PaginationQueryDto,
} from '../pagination.dto';

@Injectable()
export class ActivityLoggerService {
  constructor(
    @Inject(ACTIVITY_LOG_REPOSITORY)
    private readonly activityLogRepo: IActivityLogRepository,
  ) {}

  async log(
    actorId: string,
    action: string,
    entityType: string,
    entityId: string,
    metadata?: Record<string, any>,
  ): Promise<ActivityLog> {
    const entry = new ActivityLog();
    entry.actorId = actorId;
    entry.action = action;
    entry.entityType = entityType;
    entry.entityId = entityId;
    entry.metadata = metadata ?? null;
    return this.activityLogRepo.save(entry);
  }

  async getEntityActivity(
    entityType: string,
    entityId: string,
    query: PaginationQueryDto,
  ): Promise<PaginatedResult<ActivityLog>> {
    const skip = (query.page - 1) * query.limit;
    const [items, total] = await this.activityLogRepo.findByEntity(
      entityType,
      entityId,
      skip,
      query.limit,
    );
    return new PaginatedResult(
      items,
      new PaginationMeta(query.page, query.limit, total),
    );
  }

  async getProjectActivity(
    projectId: string,
    query: PaginationQueryDto,
  ): Promise<PaginatedResult<ActivityLog>> {
    const skip = (query.page - 1) * query.limit;
    const [items, total] = await this.activityLogRepo.findByProject(
      projectId,
      skip,
      query.limit,
    );
    return new PaginatedResult(
      items,
      new PaginationMeta(query.page, query.limit, total),
    );
  }

  async getGlobalActivity(
    query: PaginationQueryDto,
  ): Promise<PaginatedResult<ActivityLog>> {
    const skip = (query.page - 1) * query.limit;
    const [items, total] = await this.activityLogRepo.findAll(
      skip,
      query.limit,
    );
    return new PaginatedResult(
      items,
      new PaginationMeta(query.page, query.limit, total),
    );
  }
}
