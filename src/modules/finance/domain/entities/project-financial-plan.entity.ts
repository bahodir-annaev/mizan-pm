import { Entity, Column, Index, ManyToOne, JoinColumn } from 'typeorm';
import { AggregateRoot } from '../../../../shared/domain/aggregate-root';
import { Project } from '../../../project-management/domain/entities/project.entity';
import { User } from '../../../identity/domain/entities/user.entity';

@Entity('project_financial_plan')
@Index(['projectId', 'isCurrent'])
export class ProjectFinancialPlan extends AggregateRoot {
  @Column({ name: 'project_id' })
  projectId: string;

  @ManyToOne(() => Project)
  @JoinColumn({ name: 'project_id' })
  project: Project;

  @Column({ name: 'org_id', nullable: true })
  orgId: string | null;

  @Column({ type: 'smallint', default: 1 })
  version: number;

  @Column({ name: 'is_current', default: true })
  isCurrent: boolean;

  @Column({ name: 'contract_signed_date', type: 'date', nullable: true })
  contractSignedDate: string | null;

  @Column({ name: 'contract_value_uzs', type: 'decimal', precision: 15, scale: 2, nullable: true })
  contractValueUzs: number | null;

  @Column({ name: 'contract_value_usd', type: 'decimal', precision: 12, scale: 2, nullable: true })
  contractValueUsd: number | null;

  @Column({ name: 'planned_hours_total', type: 'decimal', precision: 10, scale: 2 })
  plannedHoursTotal: number;

  @Column({ name: 'avg_hourly_rate_uzs', type: 'decimal', precision: 12, scale: 4 })
  avgHourlyRateUzs: number;

  @Column({ name: 'risk_coefficient', type: 'decimal', precision: 5, scale: 3, default: 1.150 })
  riskCoefficient: number;

  @Column({ name: 'mizan_cost_uzs', type: 'decimal', precision: 15, scale: 2 })
  mizanCostUzs: number;

  @Column({ name: 'mizan_cost_usd', type: 'decimal', precision: 12, scale: 2, nullable: true })
  mizanCostUsd: number | null;

  @Column({ name: 'planned_profit_uzs', type: 'decimal', precision: 15, scale: 2, nullable: true })
  plannedProfitUzs: number | null;

  @Column({ name: 'planned_margin_pct', type: 'decimal', precision: 7, scale: 4, nullable: true })
  plannedMarginPct: number | null;

  @Column({ name: 'exchange_rate_at_signing', type: 'decimal', precision: 12, scale: 2, nullable: true })
  exchangeRateAtSigning: number | null;

  @Column({ name: 'calculated_by', nullable: true })
  calculatedBy: string | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'calculated_by' })
  calculator: User | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;
}
