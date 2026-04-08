import {
  Entity,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { AggregateRoot } from '../../../../shared/domain/aggregate-root';
import { TaskStatus } from './task-status.enum';
import { TaskPriority } from './task-priority.enum';
import { WorkType } from './work-type.enum';
import { AcceptanceStatus } from './acceptance-status.enum';
import { TaskAssignee } from './task-assignee.entity';
import { Project } from './project.entity';
import { User } from '../../../identity/domain/entities/user.entity';

@Entity('tasks')
export class Task extends AggregateRoot {
  @Column({ length: 20, nullable: true })
  code: string | null;

  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'enum', enum: TaskStatus, default: TaskStatus.PLANNING })
  status: TaskStatus;

  @Column({ type: 'enum', enum: TaskPriority, default: TaskPriority.MEDIUM })
  priority: TaskPriority;

  @Column({ name: 'work_type', type: 'enum', enum: WorkType, nullable: true })
  workType: WorkType | null;

  @Column({ type: 'enum', enum: AcceptanceStatus, nullable: true })
  acceptance: AcceptanceStatus | null;

  @Column({ type: 'smallint', default: 0 })
  progress: number;

  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  completedAt: Date | null;

  @Column({ name: 'estimated_hours', type: 'decimal', precision: 8, scale: 2, nullable: true })
  estimatedHours: number | null;

  @Column({ type: 'decimal', precision: 12, scale: 4, nullable: true })
  volume: number | null;

  @Column({ name: 'unit_of_measure', length: 50, nullable: true })
  unitOfMeasure: string | null;

  @Column({ name: 'assignee_id', nullable: true })
  assigneeId: string | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'assignee_id' })
  assignee: User | null;

  @Column({ name: 'start_date', type: 'date', nullable: true })
  startDate: Date | null;

  @Column({ name: 'due_date', type: 'date', nullable: true })
  dueDate: Date | null;

  // --- Self-referencing hierarchy ---

  @Column({ name: 'parent_id', nullable: true })
  parentId: string | null;

  @ManyToOne(() => Task, (task) => task.children, { nullable: true })
  @JoinColumn({ name: 'parent_id' })
  parent: Task | null;

  @OneToMany(() => Task, (task) => task.parent)
  children: Task[];

  @Column({ name: 'materialized_path', default: '' })
  materializedPath: string;

  @Column({ default: 0 })
  depth: number;

  @Column({ name: 'sort_order', default: 0 })
  position: number;

  // --- Relations ---

  @Column({ name: 'project_id' })
  projectId: string;

  @ManyToOne(() => Project, (project) => project.tasks)
  @JoinColumn({ name: 'project_id' })
  project: Project;

  @Column({ name: 'created_by' })
  createdBy: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'created_by' })
  creator: User;

  @OneToMany(() => TaskAssignee, (assignee) => assignee.task)
  participants: TaskAssignee[];
}
