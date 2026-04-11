import { Entity, Column, Index, Unique } from 'typeorm';
import { AggregateRoot } from '../../../../shared/domain/aggregate-root';

@Entity('exchange_rates')
@Unique(['orgId', 'rateDate'])
export class ExchangeRate extends AggregateRoot {
  @Column({ name: 'org_id', nullable: true })
  orgId: string | null;

  @Column({ name: 'rate_date', type: 'date' })
  @Index()
  rateDate: string;

  @Column({ name: 'uzs_per_usd', type: 'decimal', precision: 12, scale: 2 })
  uzsPerUsd: number;

  @Column({ length: 50, nullable: true })
  source: string | null;
}
