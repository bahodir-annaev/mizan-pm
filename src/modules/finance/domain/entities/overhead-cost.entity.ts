import { Entity, Column, Unique } from 'typeorm';
import { AggregateRoot } from '../../../../shared/domain/aggregate-root';
import { OverheadCategory } from './overhead-category.enum';

@Entity('overhead_costs')
@Unique(['orgId', 'periodYear', 'periodMonth', 'category'])
export class OverheadCost extends AggregateRoot {
  @Column({ name: 'org_id' })
  orgId: string;

  @Column({ name: 'period_year', type: 'smallint' })
  periodYear: number;

  @Column({ name: 'period_month', type: 'smallint' })
  periodMonth: number;

  @Column({ type: 'enum', enum: OverheadCategory })
  category: OverheadCategory;

  @Column({ name: 'amount_uzs', type: 'decimal', precision: 15, scale: 2 })
  amountUzs: number;

  @Column({ type: 'text', nullable: true })
  description: string | null;
}
