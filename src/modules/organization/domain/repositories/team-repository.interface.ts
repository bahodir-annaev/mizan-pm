import { Team } from '../entities/team.entity';

export const TEAM_REPOSITORY = Symbol('TEAM_REPOSITORY');

export interface ITeamRepository {
  findById(id: string): Promise<Team | null>;
  findAll(skip: number, take: number): Promise<[Team[], number]>;
  findByUserId(userId: string, skip: number, take: number): Promise<[Team[], number]>;
  save(team: Team): Promise<Team>;
  softDelete(id: string): Promise<void>;
}
