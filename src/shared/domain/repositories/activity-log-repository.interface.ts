import { ActivityLog } from '../entities/activity-log.entity';

export const ACTIVITY_LOG_REPOSITORY = Symbol('ACTIVITY_LOG_REPOSITORY');

export interface IActivityLogRepository {
  save(log: ActivityLog): Promise<ActivityLog>;
  findByEntity(
    entityType: string,
    entityId: string,
    skip: number,
    take: number,
  ): Promise<[ActivityLog[], number]>;
  findByProject(
    projectId: string,
    skip: number,
    take: number,
  ): Promise<[ActivityLog[], number]>;
  findAll(skip: number, take: number): Promise<[ActivityLog[], number]>;
}
