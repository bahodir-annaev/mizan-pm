import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Unique,
} from 'typeorm';
import { TimeEntry } from '../../../time-tracking/domain/entities/time-entry.entity';
import { User } from '../../../identity/domain/entities/user.entity';
import { Project } from '../../../project-management/domain/entities/project.entity';
import { CostSource } from './cost-source.enum';

@Entity('time_entry_costs')
@Unique(['timeEntryId'])
export class TimeEntryCost {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'time_entry_id' })
  timeEntryId: string;

  @ManyToOne(() => TimeEntry)
  @JoinColumn({ name: 'time_entry_id' })
  timeEntry: TimeEntry;

  @Column({ name: 'user_id' })
  userId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'project_id', nullable: true })
  projectId: string | null;

  @ManyToOne(() => Project, { nullable: true })
  @JoinColumn({ name: 'project_id' })
  project: Project | null;

  @Column({ name: 'org_id', nullable: true })
  orgId: string | null;

  @Column({ name: 'hourly_rate_uzs_at_entry', type: 'decimal', precision: 12, scale: 4, nullable: true })
  hourlyRateUzsAtEntry: number | null;

  @Column({ name: 'cost_uzs', type: 'decimal', precision: 15, scale: 2, nullable: true })
  costUzs: number | null;

  @Column({ name: 'cost_usd', type: 'decimal', precision: 10, scale: 2, nullable: true })
  costUsd: number | null;

  @Column({ name: 'exchange_rate_at_entry', type: 'decimal', precision: 12, scale: 2, nullable: true })
  exchangeRateAtEntry: number | null;

  @Column({ name: 'calculated_at', type: 'timestamptz' })
  calculatedAt: Date;

  @Column({ type: 'enum', enum: CostSource, default: CostSource.REALTIME })
  source: CostSource;
}
