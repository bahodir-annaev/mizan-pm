import { Project } from '../entities/project.entity';

export const PROJECT_REPOSITORY = Symbol('PROJECT_REPOSITORY');

export interface ProjectFilterParams {
  status?: string;
  teamId?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

export interface IProjectRepository {
  findById(id: string): Promise<Project | null>;
  findAll(skip: number, take: number, filters?: ProjectFilterParams): Promise<[Project[], number]>;
  findByTeamIds(teamIds: string[], skip: number, take: number, filters?: ProjectFilterParams): Promise<[Project[], number]>;
  save(project: Project): Promise<Project>;
  softDelete(id: string): Promise<void>;
}
