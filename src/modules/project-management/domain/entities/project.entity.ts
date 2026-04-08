import { Entity, Column, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { AggregateRoot } from '../../../../shared/domain/aggregate-root';
import { User } from '../../../identity/domain/entities/user.entity';
import { Team } from '../../../organization/domain/entities/team.entity';
import { Organization } from '../../../organization/domain/entities/organization.entity';
import { Task } from './task.entity';
import { ProjectStatus } from './project-status.enum';
import { ProjectType } from './project-type.enum';
import { ProjectSize } from './project-size.enum';
import { ComplexityLevel } from './complexity-level.enum';

@Entity('projects')
export class Project extends AggregateRoot {
  @Column({ name: 'org_id', nullable: true })
  orgId: string | null;

  @ManyToOne(() => Organization, { nullable: true })
  @JoinColumn({ name: 'org_id' })
  organization: Organization | null;

  @Column({ name: 'client_id', nullable: true })
  clientId: string | null;

  @Column({ name: 'parent_id', nullable: true })
  parentId: string | null;

  @ManyToOne(() => Project, { nullable: true })
  @JoinColumn({ name: 'parent_id' })
  parentProject: Project | null;

  @Column({ length: 20, nullable: true, unique: true })
  code: string | null;

  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'enum', enum: ProjectStatus, default: ProjectStatus.PLANNING })
  status: ProjectStatus;

  @Column({ type: 'enum', enum: ProjectType, nullable: true })
  projectType: ProjectType | null;

  @Column({ type: 'enum', enum: ProjectSize, nullable: true })
  size: ProjectSize | null;

  @Column({ type: 'enum', enum: ComplexityLevel, nullable: true })
  complexity: ComplexityLevel | null;

  @Column({ type: 'enum', enum: ['LOW', 'MEDIUM', 'HIGH'], nullable: true })
  priority: string | null;

  @Column({ name: 'area_sqm', type: 'decimal', precision: 10, scale: 2, nullable: true })
  areaSqm: number | null;

  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  budget: number | null;

  @Column({ type: 'smallint', default: 0 })
  progress: number;

  @Column({ name: 'estimated_duration', length: 50, nullable: true })
  estimatedDuration: string | null;

  @Column({ length: 7, nullable: true })
  color: string | null;

  @Column({ name: 'is_pinned', default: false })
  isPinned: boolean;

  @Column({ name: 'is_archived', default: false })
  isArchived: boolean;

  @Column({ name: 'start_date', type: 'date', nullable: true })
  startDate: Date | null;

  @Column({ name: 'due_date', type: 'date', nullable: true })
  dueDate: Date | null;

  @Column({ name: 'team_id', nullable: true })
  teamId: string | null;

  @ManyToOne(() => Team, { nullable: true })
  @JoinColumn({ name: 'team_id' })
  team: Team | null;

  @Column({ name: 'created_by' })
  createdBy: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'created_by' })
  creator: User;

  @OneToMany(() => Task, (task) => task.project)
  tasks: Task[];
}
