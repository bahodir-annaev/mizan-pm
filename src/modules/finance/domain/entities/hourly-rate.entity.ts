import { Entity, Column, Index, Unique, ManyToOne, JoinColumn } from 'typeorm';
import { AggregateRoot } from '../../../../shared/domain/aggregate-root';
import { User } from '../../../identity/domain/entities/user.entity';

@Entity('hourly_rates')
@Unique(['userId', 'effectiveDate'])
@Index(['userId', 'effectiveDate'])
export class HourlyRate extends AggregateRoot {
  @Column({ name: 'user_id' })
  userId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'org_id', nullable: true })
  orgId: string | null;

  @Column({ name: 'effective_date', type: 'date' })
  effectiveDate: string;

  @Column({ name: 'salary_uzs', type: 'decimal', precision: 15, scale: 2 })
  salaryUzs: number;

  @Column({ name: 'bonus_uzs', type: 'decimal', precision: 15, scale: 2, default: 0 })
  bonusUzs: number;

  @Column({ name: 'tax_uzs', type: 'decimal', precision: 15, scale: 2, default: 0 })
  taxUzs: number;

  @Column({ name: 'jssm_uzs', type: 'decimal', precision: 15, scale: 2, default: 0 })
  jssmUzs: number;

  @Column({ name: 'admin_share_uzs', type: 'decimal', precision: 15, scale: 2, default: 0 })
  adminShareUzs: number;

  @Column({ name: 'equipment_share_uzs', type: 'decimal', precision: 15, scale: 2, default: 0 })
  equipmentShareUzs: number;

  @Column({ name: 'overhead_share_uzs', type: 'decimal', precision: 15, scale: 2, default: 0 })
  overheadShareUzs: number;

  @Column({ name: 'total_monthly_cost_uzs', type: 'decimal', precision: 15, scale: 2 })
  totalMonthlyCostUzs: number;

  @Column({ name: 'hourly_rate_uzs', type: 'decimal', precision: 12, scale: 4 })
  hourlyRateUzs: number;

  @Column({ name: 'hourly_rate_usd', type: 'decimal', precision: 10, scale: 4, nullable: true })
  hourlyRateUsd: number | null;

  @Column({ name: 'exchange_rate_used', type: 'decimal', precision: 12, scale: 2, nullable: true })
  exchangeRateUsed: number | null;

  @Column({ name: 'production_employee_count', type: 'smallint', default: 15 })
  productionEmployeeCount: number;

  @Column({ name: 'working_hours_per_month', type: 'smallint', default: 176 })
  workingHoursPerMonth: number;

  @Column({ type: 'text', nullable: true })
  notes: string | null;
}
