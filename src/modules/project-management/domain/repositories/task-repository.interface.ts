import { Task } from '../entities/task.entity';
import { TaskAssignee } from '../entities/task-assignee.entity';

export const TASK_REPOSITORY = Symbol('TASK_REPOSITORY');

export interface TaskFilterParams {
  projectId?: string;
  status?: string;
  priority?: string;
  assigneeId?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
  maxDepth?: number;
}

export interface ITaskRepository {
  // --- Core CRUD ---
  findById(id: string, relations?: string[]): Promise<Task | null>;
  save(task: Task): Promise<Task>;
  saveMany(tasks: Task[]): Promise<Task[]>;
  softDelete(id: string): Promise<void>;
  softDeleteMany(ids: string[]): Promise<void>;

  // --- Hierarchy queries ---
  findChildren(parentId: string): Promise<Task[]>;
  findSubtree(materializedPathPrefix: string): Promise<Task[]>;
  findTopLevelByProject(
    projectId: string,
    filters: TaskFilterParams,
    skip: number,
    take: number,
  ): Promise<[Task[], number]>;
  findByProject(
    projectId: string,
    filters: TaskFilterParams,
    skip: number,
    take: number,
  ): Promise<[Task[], number]>;

  // --- Position ---
  getMaxPositionAmongSiblings(
    projectId: string,
    parentId: string | null,
  ): Promise<number>;

  // --- Subtree path update (for move operations) ---
  updateSubtreePaths(
    oldPathPrefix: string,
    newPathPrefix: string,
    depthDelta: number,
  ): Promise<void>;

  // --- Cross-project user task list ---
  findForUser(
    userId: string,
    filters: TaskFilterParams,
    skip: number,
    take: number,
  ): Promise<[Task[], number]>;

  // --- Assignee operations ---
  findAssignee(taskId: string, userId: string): Promise<TaskAssignee | null>;
  findAssigneesByTask(taskId: string): Promise<TaskAssignee[]>;
  saveAssignee(assignee: TaskAssignee): Promise<TaskAssignee>;
  removeAssignee(assignee: TaskAssignee): Promise<void>;

  // --- Cascading helpers ---
  findNonCompletedChildren(parentId: string): Promise<Task[]>;
  findAllChildrenIds(parentId: string): Promise<string[]>;
  areAllChildrenDone(parentId: string): Promise<boolean>;
}
