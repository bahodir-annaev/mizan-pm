import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  Inject,
  Optional,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { createHash, randomUUID } from 'crypto';
import { User } from '../../domain/entities/user.entity';
import { Role } from '../../domain/entities/role.entity';
import { UserRole } from '../../domain/entities/user-role.entity';
import { RefreshToken } from '../../domain/entities/refresh-token.entity';
import { Password } from '../../domain/value-objects/password.vo';
import {
  IUserRepository,
  USER_REPOSITORY,
} from '../../domain/repositories/user-repository.interface';
import { OrganizationService } from '../../../organization/application/services/organization.service';
import { RegisterDto } from '../dtos/register.dto';
import { LoginDto } from '../dtos/login.dto';

export interface AuthResult {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    roles: string[];
    orgId?: string | null;
  };
}

@Injectable()
export class AuthService {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
    @InjectRepository(UserRole)
    private readonly userRoleRepository: Repository<UserRole>,
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepository: Repository<RefreshToken>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @Optional()
    private readonly organizationService?: OrganizationService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResult> {
    const existing = await this.userRepository.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const rounds = this.configService.get<number>('BCRYPT_ROUNDS', 12);
    const passwordHash = await Password.hash(dto.password, rounds);

    // If orgName provided, create a new organization
    let orgId: string | null = null;
    if (dto.orgName && this.organizationService) {
      const org = await this.organizationService.createFromName(dto.orgName);
      orgId = org.id;
    }

    // When creating an org, the registering user gets 'admin' role; otherwise 'member'
    const roleName = orgId ? 'admin' : 'member';
    const role = await this.roleRepository.findOne({
      where: { name: roleName },
    });

    const user = new User();
    user.email = dto.email.toLowerCase().trim();
    user.passwordHash = passwordHash;
    user.firstName = dto.firstName;
    user.lastName = dto.lastName;
    user.orgId = orgId;
    user.isActive = true;
    user.userRoles = [];

    const savedUser = await this.userRepository.save(user);

    if (role) {
      const userRole = new UserRole();
      userRole.userId = savedUser.id;
      userRole.roleId = role.id;
      userRole.assignedBy = null;
      await this.userRoleRepository.save(userRole);
    }

    // Re-fetch to get full relations
    const fullUser = await this.userRepository.findById(savedUser.id);
    return this.generateAuthResult(fullUser!);
  }

  async login(dto: LoginDto): Promise<AuthResult> {
    const user = await this.validateUser(dto.email, dto.password);
    user.lastActiveAt = new Date();
    await this.userRepository.save(user);

    return this.generateAuthResult(user);
  }

  async validateUser(email: string, password: string): Promise<User> {
    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Account is deactivated');
    }

    const isMatch = await Password.compare(password, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return user;
  }

  async refresh(refreshToken: string): Promise<AuthResult> {
    let payload: any;
    try {
      payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const tokenHash = this.hashToken(refreshToken);
    const storedToken = await this.refreshTokenRepository.findOne({
      where: { tokenHash, userId: payload.sub },
    });

    if (!storedToken) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const user = await this.userRepository.findById(payload.sub);
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Token rotation: delete old token
    await this.refreshTokenRepository.remove(storedToken);

    return this.generateAuthResult(user);
  }

  async logout(userId: string): Promise<void> {
    await this.refreshTokenRepository.delete({ userId });
  }

  async revokeAllTokens(userId: string): Promise<void> {
    await this.refreshTokenRepository.delete({ userId });
  }

  async forgotPassword(email: string): Promise<void> {
    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      return;
    }

    const resetToken = randomUUID();
    user.passwordResetToken = resetToken;
    user.passwordResetExpires = new Date(Date.now() + 3600000); // 1 hour
    await this.userRepository.save(user);

    // Stub: log to console since no email service
    console.log(`[PASSWORD RESET] Token for ${email}: ${resetToken}`);
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const user = await this.userRepository.findByResetToken(token);
    if (!user) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    if (user.passwordResetExpires && user.passwordResetExpires < new Date()) {
      throw new BadRequestException('Reset token has expired');
    }

    const rounds = this.configService.get<number>('BCRYPT_ROUNDS', 12);
    user.passwordHash = await Password.hash(newPassword, rounds);
    user.passwordResetToken = null;
    user.passwordResetExpires = null;
    await this.userRepository.save(user);

    // Revoke all refresh tokens on password reset
    await this.revokeAllTokens(user.id);
  }

  private async generateAuthResult(user: User): Promise<AuthResult> {
    const roleNames = user.roles?.map((r) => r.name) || [];
    const payload = {
      sub: user.id,
      email: user.email,
      roles: roleNames,
      orgId: user.orgId,
    };

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: this.configService.get<string>('JWT_ACCESS_EXPIRATION', '15m') as any,
    });

    const refreshToken = this.jwtService.sign(
      { sub: user.id, jti: randomUUID(), type: 'refresh' },
      {
        expiresIn: this.configService.get<string>(
          'JWT_REFRESH_EXPIRATION',
          '7d',
        ) as any,
      },
    );

    // Store hashed refresh token in dedicated table
    const tokenHash = this.hashToken(refreshToken);
    const refreshTokenEntity = new RefreshToken();
    refreshTokenEntity.userId = user.id;
    refreshTokenEntity.tokenHash = tokenHash;
    refreshTokenEntity.expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await this.refreshTokenRepository.save(refreshTokenEntity);

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        roles: roleNames,
        orgId: user.orgId,
      },
    };
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
