import { Entity, Column, OneToMany, ManyToOne, JoinColumn } from 'typeorm';
import { AggregateRoot } from '../../../../shared/domain/aggregate-root';
import { UserRole } from './user-role.entity';
import { EmployeeStatus } from './employee-status.enum';
import { Exclude } from 'class-transformer';
import { Organization } from '../../../organization/domain/entities/organization.entity';

@Entity('users')
export class User extends AggregateRoot {
  @Column({ name: 'org_id', nullable: true })
  orgId: string | null;

  @ManyToOne(() => Organization, { nullable: true })
  @JoinColumn({ name: 'org_id' })
  organization: Organization | null;

  @Column({ unique: true })
  email: string;

  @Column({ name: 'password_hash' })
  @Exclude()
  passwordHash: string;

  @Column({ name: 'first_name' })
  firstName: string;

  @Column({ name: 'last_name' })
  lastName: string;

  @Column({ name: 'avatar_url', nullable: true })
  avatarUrl: string | null;

  @Column({ nullable: true, length: 50 })
  phone: string | null;

  @Column({ nullable: true, length: 255 })
  position: string | null;

  @Column({ nullable: true, length: 255 })
  department: string | null;

  @Column({ nullable: true, length: 255 })
  location: string | null;

  @Column({ name: 'join_date', type: 'date', nullable: true })
  joinDate: Date | null;

  @Column({
    type: 'enum',
    enum: EmployeeStatus,
    default: EmployeeStatus.INACTIVE,
  })
  status: EmployeeStatus;

  @Column({ type: 'text', array: true, nullable: true })
  skills: string[] | null;

  @Column({ type: 'smallint', nullable: true })
  performance: number | null;

  @Column({ type: 'jsonb', nullable: true })
  preferences: Record<string, any> | null;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'last_active_at', nullable: true })
  lastActiveAt: Date | null;

  @Column({ name: 'password_reset_token', nullable: true })
  @Exclude()
  passwordResetToken: string | null;

  @Column({ name: 'password_reset_expires', nullable: true })
  passwordResetExpires: Date | null;

  @OneToMany(() => UserRole, (ur) => ur.user)
  userRoles: UserRole[];

  /** Helper: extract Role[] from the loaded userRoles relation */
  get roles(): { id: string; name: string; permissions: any[] }[] {
    return this.userRoles?.map((ur) => ur.role).filter(Boolean) || [];
  }

  /** Computed full name */
  get name(): string {
    return `${this.firstName} ${this.lastName}`.trim();
  }

  /** Convenience: primary role name for the frontend's simple role model */
  get primaryRole(): string {
    const roleNames = this.roles.map((r) => r.name);
    if (roleNames.includes('admin') || roleNames.includes('owner')) return 'admin';
    if (roleNames.includes('manager')) return 'manager';
    return 'member';
  }
}
