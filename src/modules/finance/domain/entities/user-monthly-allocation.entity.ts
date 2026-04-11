import { Entity, Column, Index, Unique, ManyToOne, JoinColumn } from 'typeorm';
import { AggregateRoot } from '../../../../shared/domain/aggregate-root';
import { User } from '../../../identity/domain/entities/user.entity';
import { Project } from '../../../project-management/domain/entities/project.entity';

@Entity('user_monthly_allocation')
@Unique(['userId', 'projectId', 'periodYear', 'periodMonth'])
@Index(['orgId', 'periodYear', 'periodMonth'])
export class UserMonthlyAllocation extends AggregateRoot {
  @Column({ name: 'user_id' })
  userId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'project_id' })
  projectId: string;

  @ManyToOne(() => Project)
  @JoinColumn({ name: 'project_id' })
  project: Project;

  @Column({ name: 'org_id', nullable: true })
  orgId: string | null;

  @Column({ name: 'period_year', type: 'smallint' })
  periodYear: number;

  @Column({ name: 'period_month', type: 'smallint' })
  periodMonth: number;

  @Column({ name: 'hours_logged', type: 'decimal', precision: 10, scale: 2 })
  hoursLogged: number;

  @Column({ name: 'hourly_rate_uzs_snapshot', type: 'decimal', precision: 12, scale: 4 })
  hourlyRateUzsSnapshot: number;

  @Column({ name: 'cost_uzs', type: 'decimal', precision: 15, scale: 2 })
  costUzs: number;

  @Column({ name: 'cost_usd', type: 'decimal', precision: 12, scale: 2, nullable: true })
  costUsd: number | null;

  @Column({ name: 'exchange_rate_snapshot', type: 'decimal', precision: 12, scale: 2, nullable: true })
  exchangeRateSnapshot: number | null;

  @Column({ name: 'is_finalized', default: false })
  isFinalized: boolean;

  @Column({ name: 'calculated_at', type: 'timestamptz', nullable: true })
  calculatedAt: Date | null;
}
