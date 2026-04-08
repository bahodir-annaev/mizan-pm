import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ActivityLog } from '../../domain/entities/activity-log.entity';
import { IActivityLogRepository } from '../../domain/repositories/activity-log-repository.interface';

@Injectable()
export class TypeOrmActivityLogRepository implements IActivityLogRepository {
  constructor(
    @InjectRepository(ActivityLog)
    private readonly repo: Repository<ActivityLog>,
  ) {}

  async save(log: ActivityLog): Promise<ActivityLog> {
    return this.repo.save(log);
  }

  async findByEntity(
    entityType: string,
    entityId: string,
    skip: number,
    take: number,
  ): Promise<[ActivityLog[], number]> {
    return this.repo.findAndCount({
      where: { entityType, entityId },
      relations: ['actor'],
      order: { createdAt: 'DESC' },
      skip,
      take,
    });
  }

  async findByProject(
    projectId: string,
    skip: number,
    take: number,
  ): Promise<[ActivityLog[], number]> {
    const qb = this.repo
      .createQueryBuilder('log')
      .leftJoinAndSelect('log.actor', 'actor')
      .where(
        `(log.entityType = 'project' AND log.entityId = :projectId)
         OR (log.entityType = 'task' AND log.entityId IN (
           SELECT t.id FROM task t WHERE t.project_id = :projectId
         ))`,
        { projectId },
      )
      .orderBy('log.createdAt', 'DESC')
      .skip(skip)
      .take(take);

    return qb.getManyAndCount();
  }

  async findAll(
    skip: number,
    take: number,
  ): Promise<[ActivityLog[], number]> {
    return this.repo.findAndCount({
      relations: ['actor'],
      order: { createdAt: 'DESC' },
      skip,
      take,
    });
  }
}
