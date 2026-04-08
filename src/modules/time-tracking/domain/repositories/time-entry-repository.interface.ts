import { TimeEntry } from '../entities/time-entry.entity';

export const TIME_ENTRY_REPOSITORY = Symbol('TIME_ENTRY_REPOSITORY');

export interface TimeEntryFilterParams {
  taskId?: string;
  startDate?: string;
  endDate?: string;
  isManual?: boolean;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

export interface ProjectTimeReportRow {
  taskId: string;
  taskTitle: string;
  totalSeconds: number;
  entryCount: number;
}

export interface ITimeEntryRepository {
  findById(id: string, relations?: string[]): Promise<TimeEntry | null>;
  findActiveByUser(userId: string): Promise<TimeEntry | null>;
  findActiveByUserAndTask(userId: string, taskId: string): Promise<TimeEntry | null>;
  findAllActive(): Promise<TimeEntry[]>;
  save(entry: TimeEntry): Promise<TimeEntry>;
  remove(entry: TimeEntry): Promise<void>;
  findByTask(taskId: string, skip: number, take: number): Promise<[TimeEntry[], number]>;
  findByUser(userId: string, filters: TimeEntryFilterParams, skip: number, take: number): Promise<[TimeEntry[], number]>;
  getProjectTimeReport(projectId: string): Promise<ProjectTimeReportRow[]>;
}
