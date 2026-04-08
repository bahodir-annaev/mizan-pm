import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Team } from '../../domain/entities/team.entity';
import { ITeamRepository } from '../../domain/repositories/team-repository.interface';

@Injectable()
export class TypeOrmTeamRepository implements ITeamRepository {
  constructor(
    @InjectRepository(Team)
    private readonly repo: Repository<Team>,
  ) {}

  async findById(id: string): Promise<Team | null> {
    return this.repo.findOne({
      where: { id },
      relations: ['creator', 'memberships', 'memberships.user'],
    });
  }

  async findAll(skip: number, take: number): Promise<[Team[], number]> {
    return this.repo.findAndCount({
      skip,
      take,
      relations: ['creator'],
      order: { createdAt: 'DESC' },
    });
  }

  async findByUserId(
    userId: string,
    skip: number,
    take: number,
  ): Promise<[Team[], number]> {
    return this.repo
      .createQueryBuilder('team')
      .innerJoin('team.memberships', 'membership', 'membership.userId = :userId', {
        userId,
      })
      .leftJoinAndSelect('team.creator', 'creator')
      .skip(skip)
      .take(take)
      .orderBy('team.createdAt', 'DESC')
      .getManyAndCount();
  }

  async save(team: Team): Promise<Team> {
    return this.repo.save(team);
  }

  async softDelete(id: string): Promise<void> {
    await this.repo.softDelete(id);
  }
}
