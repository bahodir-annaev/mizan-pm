import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../../identity/domain/entities/user.entity';
import { Task } from '../../../project-management/domain/entities/task.entity';
import { Project } from '../../../project-management/domain/entities/project.entity';

@Entity('time_entries')
export class TimeEntry {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'task_id' })
  taskId: string;

  @ManyToOne(() => Task)
  @JoinColumn({ name: 'task_id' })
  task: Task;

  @Column({ name: 'user_id' })
  userId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'start_time', type: 'timestamptz' })
  startTime: Date;

  @Column({ name: 'end_time', type: 'timestamptz', nullable: true })
  endTime: Date | null;

  @Column({ name: 'duration_seconds', nullable: true })
  durationSeconds: number | null;

  @Column({ nullable: true })
  description: string | null;

  @Column({ name: 'is_manual', default: false })
  isManual: boolean;

  @Column({ name: 'project_id', nullable: true })
  projectId: string | null;

  @ManyToOne(() => Project, { nullable: true })
  @JoinColumn({ name: 'project_id' })
  project: Project;

  @Column({ type: 'date', nullable: true })
  date: string | null;

  @Column({ type: 'decimal', precision: 8, scale: 2, nullable: true })
  hours: number | null;

  @Column({ name: 'is_billable', default: false })
  isBillable: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
