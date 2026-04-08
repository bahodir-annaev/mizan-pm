import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { Task } from './task.entity';

@Entity('task_dependencies')
@Unique(['blockerId', 'blockedId'])
export class TaskDependency {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'blocker_id' })
  blockerId: string;

  @ManyToOne(() => Task, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'blocker_id' })
  blocker: Task;

  @Column({ name: 'blocked_id' })
  blockedId: string;

  @ManyToOne(() => Task, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'blocked_id' })
  blocked: Task;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
