import { Entity, Column, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { AggregateRoot } from '../../../../shared/domain/aggregate-root';
import { User } from '../../../identity/domain/entities/user.entity';
import { Organization } from '../../../organization/domain/entities/organization.entity';
import { ContactPerson } from './contact-person.entity';
import { ClientType } from './client-type.enum';

@Entity('clients')
export class Client extends AggregateRoot {
  @Column({ name: 'org_id', nullable: true })
  orgId: string | null;

  @ManyToOne(() => Organization, { nullable: true })
  @JoinColumn({ name: 'org_id' })
  organization: Organization | null;

  @Column()
  name: string;

  @Column({
    name: 'client_type',
    type: 'enum',
    enum: ClientType,
    default: ClientType.INDIVIDUAL,
  })
  clientType: ClientType;

  @Column({ nullable: true })
  email: string | null;

  @Column({ nullable: true })
  phone: string | null;

  @Column({ nullable: true })
  address: string | null;

  @Column({ nullable: true })
  website: string | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ name: 'is_favorite', default: false })
  isFavorite: boolean;

  @Column({ name: 'group', type: 'varchar', nullable: true })
  group: string | null;

  @Column({ name: 'created_by' })
  createdBy: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'created_by' })
  creator: User;

  @OneToMany(() => ContactPerson, (contact) => contact.client, { cascade: true })
  contacts: ContactPerson[];
}
