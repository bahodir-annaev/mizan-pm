import { Entity, Column, Index } from 'typeorm';
import { AggregateRoot } from '../../../../shared/domain/aggregate-root';

@Entity('equipment')
@Index(['orgId', 'isActive'])
export class Equipment extends AggregateRoot {
  @Column({ name: 'org_id' })
  orgId: string;

  @Column({ length: 255 })
  name: string;

  @Column({ length: 100, nullable: true })
  category: string | null;

  @Column({ name: 'purchase_date', type: 'date' })
  purchaseDate: string;

  @Column({ name: 'purchase_cost_uzs', type: 'decimal', precision: 15, scale: 2 })
  purchaseCostUzs: number;

  @Column({ name: 'useful_life_months', type: 'smallint' })
  usefulLifeMonths: number;

  @Column({ name: 'monthly_amortization_uzs', type: 'decimal', precision: 12, scale: 2 })
  monthlyAmortizationUzs: number;

  @Column({ name: 'residual_value_uzs', type: 'decimal', precision: 15, scale: 2, default: 0 })
  residualValueUzs: number;

  @Column({ name: 'decommission_date', type: 'date', nullable: true })
  decommissionDate: string | null;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'serial_number', length: 100, nullable: true })
  serialNumber: string | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;
}
