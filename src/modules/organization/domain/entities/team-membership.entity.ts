import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Unique,
} from 'typeorm';
import { Team } from './team.entity';
import { User } from '../../../identity/domain/entities/user.entity';
import { TeamRole } from './team-role.enum';

@Entity('team_memberships')
@Unique(['teamId', 'userId'])
export class TeamMembership {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'team_id' })
  teamId: string;

  @ManyToOne(() => Team, (team) => team.memberships, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'team_id' })
  team: Team;

  @Column({ name: 'user_id' })
  userId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'team_role', type: 'enum', enum: TeamRole, default: TeamRole.MEMBER })
  teamRole: TeamRole;

  @CreateDateColumn({ name: 'joined_at' })
  joinedAt: Date;
}
