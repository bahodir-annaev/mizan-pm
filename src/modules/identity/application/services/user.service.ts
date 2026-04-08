import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
  ConflictException,
  Inject,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { User } from '../../domain/entities/user.entity';
import { Role } from '../../domain/entities/role.entity';
import { UserRole } from '../../domain/entities/user-role.entity';
import { RefreshToken } from '../../domain/entities/refresh-token.entity';
import { EmployeeStatus } from '../../domain/entities/employee-status.enum';
import { Password } from '../../domain/value-objects/password.vo';
import {
  IUserRepository,
  USER_REPOSITORY,
} from '../../domain/repositories/user-repository.interface';
import { UpdateUserDto } from '../dtos/update-user.dto';
import { ChangePasswordDto } from '../dtos/change-password.dto';
import { CreateUserDto } from '../dtos/create-user.dto';
import {
  PaginationQueryDto,
  PaginatedResult,
  PaginationMeta,
} from '../../../../shared/application/pagination.dto';

@Injectable()
export class UserService {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
    @InjectRepository(UserRole)
    private readonly userRoleRepository: Repository<UserRole>,
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepository: Repository<RefreshToken>,
    private readonly configService: ConfigService,
  ) {}

  async findAll(query: PaginationQueryDto): Promise<PaginatedResult<User>> {
    const skip = (query.page - 1) * query.limit;
    const [users, total] = await this.userRepository.findAll(skip, query.limit);
    return new PaginatedResult(users, new PaginationMeta(query.page, query.limit, total));
  }

  async findById(id: string): Promise<User> {
    const user = await this.userRepository.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async create(dto: CreateUserDto, orgId: string | null, creatorId: string): Promise<User> {
    const existing = await this.userRepository.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const rounds = this.configService.get<number>('BCRYPT_ROUNDS', 12);
    const passwordHash = await Password.hash(dto.password, rounds);

    const user = new User();
    user.email = dto.email.toLowerCase().trim();
    user.passwordHash = passwordHash;
    user.firstName = dto.firstName;
    user.lastName = dto.lastName;
    user.orgId = orgId;
    user.isActive = true;
    user.userRoles = [];

    const savedUser = await this.userRepository.save(user);

    const roleName = dto.roleName || 'member';
    const role = await this.roleRepository.findOne({ where: { name: roleName } });
    if (role) {
      const userRole = new UserRole();
      userRole.userId = savedUser.id;
      userRole.roleId = role.id;
      userRole.assignedBy = creatorId;
      await this.userRoleRepository.save(userRole);
    }

    return this.findById(savedUser.id);
  }

  async update(id: string, dto: UpdateUserDto): Promise<User> {
    const user = await this.findById(id);
    Object.assign(user, dto);
    return this.userRepository.save(user);
  }

  async updateStatus(id: string, status: EmployeeStatus): Promise<User> {
    const user = await this.findById(id);
    user.status = status;
    user.lastActiveAt = new Date();
    return this.userRepository.save(user);
  }

  async assignOrganization(userId: string, orgId: string | null): Promise<User> {
    const user = await this.findById(userId);
    user.orgId = orgId;
    return this.userRepository.save(user);
  }

  async updatePreferences(id: string, preferences: Record<string, any>): Promise<User> {
    const user = await this.findById(id);
    user.preferences = preferences;
    return this.userRepository.save(user);
  }

  async changePassword(userId: string, dto: ChangePasswordDto): Promise<void> {
    const user = await this.findById(userId);
    const isMatch = await Password.compare(dto.currentPassword, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    const rounds = this.configService.get<number>('BCRYPT_ROUNDS', 12);
    user.passwordHash = await Password.hash(dto.newPassword, rounds);
    await this.userRepository.save(user);

    // Invalidate all sessions by revoking refresh tokens
    await this.refreshTokenRepository.delete({ userId });
  }

  async softDelete(id: string): Promise<void> {
    await this.findById(id);
    await this.userRepository.softDelete(id);
  }

  async getUserRoles(userId: string): Promise<UserRole[]> {
    await this.findById(userId);
    return this.userRoleRepository.find({
      where: { userId },
      relations: ['role', 'role.permissions', 'assignedByUser'],
    });
  }

  async assignRole(userId: string, roleName: string, assignedBy?: string): Promise<User> {
    const user = await this.findById(userId);
    const role = await this.roleRepository.findOne({ where: { name: roleName } });
    if (!role) {
      throw new NotFoundException(`Role '${roleName}' not found`);
    }

    const hasRole = user.userRoles?.some((ur) => ur.roleId === role.id);
    if (!hasRole) {
      const userRole = new UserRole();
      userRole.userId = userId;
      userRole.roleId = role.id;
      userRole.assignedBy = assignedBy ?? null;
      await this.userRoleRepository.save(userRole);
      return this.findById(userId);
    }
    return user;
  }

  async removeRole(userId: string, roleName: string): Promise<User> {
    await this.findById(userId);
    const role = await this.roleRepository.findOne({ where: { name: roleName } });
    if (!role) {
      throw new NotFoundException(`Role '${roleName}' not found`);
    }

    await this.userRoleRepository.delete({ userId, roleId: role.id });
    return this.findById(userId);
  }
}
