import { Entity, Column, Index, Unique, ManyToOne, JoinColumn } from 'typeorm';
import { AggregateRoot } from '../../../../shared/domain/aggregate-root';
import { Project } from '../../../project-management/domain/entities/project.entity';

@Entity('project_monthly_costs')
@Unique(['projectId', 'periodYear', 'periodMonth'])
@Index(['orgId', 'periodYear', 'periodMonth'])
export class ProjectMonthlyCost extends AggregateRoot {
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

  @Column({ name: 'total_hours', type: 'decimal', precision: 10, scale: 2 })
  totalHours: number;

  @Column({ name: 'total_cost_uzs', type: 'decimal', precision: 15, scale: 2 })
  totalCostUzs: number;

  @Column({ name: 'total_cost_usd', type: 'decimal', precision: 12, scale: 2, nullable: true })
  totalCostUsd: number | null;

  @Column({ name: 'employee_count', type: 'smallint' })
  employeeCount: number;

  @Column({ name: 'avg_hourly_rate_uzs', type: 'decimal', precision: 12, scale: 4, nullable: true })
  avgHourlyRateUzs: number | null;

  @Column({ name: 'is_finalized', default: false })
  isFinalized: boolean;

  @Column({ name: 'calculated_at', type: 'timestamptz', nullable: true })
  calculatedAt: Date | null;
}
