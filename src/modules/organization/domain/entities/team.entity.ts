import { Entity, Column, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { AggregateRoot } from '../../../../shared/domain/aggregate-root';
import { User } from '../../../identity/domain/entities/user.entity';
import { TeamMembership } from './team-membership.entity';

@Entity('teams')
export class Team extends AggregateRoot {
  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ name: 'created_by' })
  createdBy: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'created_by' })
  creator: User;

  @OneToMany(() => TeamMembership, (membership) => membership.team)
  memberships: TeamMembership[];
}
