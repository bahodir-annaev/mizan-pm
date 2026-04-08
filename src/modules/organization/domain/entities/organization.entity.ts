import { Entity, Column } from 'typeorm';
import { AggregateRoot } from '../../../../shared/domain/aggregate-root';

@Entity('organizations')
export class Organization extends AggregateRoot {
  @Column({ unique: true })
  name: string;

  @Column({ unique: true })
  slug: string;

  @Column({ name: 'logo_url', nullable: true })
  logoUrl: string | null;

  @Column({ name: 'budget_limit', type: 'decimal', precision: 15, scale: 2, nullable: true })
  budgetLimit: number | null;

  @Column({ type: 'jsonb', nullable: true })
  settings: Record<string, any> | null;
}
