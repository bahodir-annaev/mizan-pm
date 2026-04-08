import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ConflictException, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AuthService } from './auth.service';
import { Role } from '../../domain/entities/role.entity';
import { UserRole } from '../../domain/entities/user-role.entity';
import { RefreshToken } from '../../domain/entities/refresh-token.entity';
import { User } from '../../domain/entities/user.entity';
import { USER_REPOSITORY } from '../../domain/repositories/user-repository.interface';
import { Password } from '../../domain/value-objects/password.vo';

describe('AuthService', () => {
  let service: AuthService;
  let userRepository: any;
  let roleRepository: any;
  let userRoleRepository: any;
  let refreshTokenRepository: any;
  let jwtService: any;

  const mockUser: Partial<User> = {
    id: 'user-uuid-1',
    email: 'test@example.com',
    passwordHash: 'hashed-password',
    firstName: 'John',
    lastName: 'Doe',
    isActive: true,
    passwordResetToken: null,
    passwordResetExpires: null,
    userRoles: [
      { userId: 'user-uuid-1', roleId: 'role-1', role: { id: 'role-1', name: 'member', permissions: [] } as any } as any,
    ],
    lastActiveAt: null,
  };

  // The `roles` getter is defined on the User class, so for mocks we need to provide it
  Object.defineProperty(mockUser, 'roles', {
    get() {
      return this.userRoles?.map((ur: any) => ur.role).filter(Boolean) || [];
    },
    configurable: true,
  });

  const mockRole = { id: 'role-1', name: 'member', permissions: [] };

  beforeEach(async () => {
    userRepository = {
      findByEmail: jest.fn(),
      findById: jest.fn(),
      findByResetToken: jest.fn(),
      save: jest.fn(),
      findAll: jest.fn(),
      softDelete: jest.fn(),
    };

    roleRepository = {
      findOne: jest.fn(),
    };

    userRoleRepository = {
      save: jest.fn(),
      delete: jest.fn(),
    };

    refreshTokenRepository = {
      save: jest.fn().mockImplementation((entity: any) => ({ ...entity, id: 'rt-1' })),
      findOne: jest.fn(),
      remove: jest.fn(),
      delete: jest.fn(),
    };

    jwtService = {
      sign: jest.fn().mockReturnValue('test-jwt-token'),
      verify: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: USER_REPOSITORY, useValue: userRepository },
        { provide: getRepositoryToken(Role), useValue: roleRepository },
        { provide: getRepositoryToken(UserRole), useValue: userRoleRepository },
        { provide: getRepositoryToken(RefreshToken), useValue: refreshTokenRepository },
        { provide: JwtService, useValue: jwtService },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultVal?: any) => {
              const map: Record<string, any> = {
                BCRYPT_ROUNDS: 4,
                JWT_ACCESS_EXPIRATION: '15m',
                JWT_REFRESH_EXPIRATION: '7d',
                JWT_SECRET: 'test-secret',
              };
              return map[key] ?? defaultVal;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  describe('register', () => {
    it('should register a new user and return auth result', async () => {
      userRepository.findByEmail.mockResolvedValue(null);
      roleRepository.findOne.mockResolvedValue(mockRole);
      userRepository.save.mockImplementation((user: any) => ({
        ...user,
        id: 'new-user-id',
      }));
      userRepository.findById.mockResolvedValue({
        id: 'new-user-id',
        email: 'new@example.com',
        firstName: 'Jane',
        lastName: 'Doe',
        userRoles: [{ role: mockRole }],
        get roles() {
          return this.userRoles?.map((ur: any) => ur.role).filter(Boolean) || [];
        },
      });

      const result = await service.register({
        email: 'new@example.com',
        password: 'Password123',
        firstName: 'Jane',
        lastName: 'Doe',
      });

      expect(result.accessToken).toBe('test-jwt-token');
      expect(result.refreshToken).toBe('test-jwt-token');
      expect(result.user.email).toBe('new@example.com');
      expect(userRepository.findByEmail).toHaveBeenCalledWith('new@example.com');
      expect(roleRepository.findOne).toHaveBeenCalledWith({ where: { name: 'member' } });
      expect(userRoleRepository.save).toHaveBeenCalled();
      expect(refreshTokenRepository.save).toHaveBeenCalled();
    });

    it('should throw ConflictException if email already registered', async () => {
      userRepository.findByEmail.mockResolvedValue(mockUser);

      await expect(
        service.register({
          email: 'test@example.com',
          password: 'Password123',
          firstName: 'John',
          lastName: 'Doe',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('login', () => {
    it('should login and return auth result', async () => {
      const hashedPassword = await Password.hash('Password123', 4);
      const loginUser = {
        ...mockUser,
        passwordHash: hashedPassword,
        get roles() {
          return this.userRoles?.map((ur: any) => ur.role).filter(Boolean) || [];
        },
      };
      userRepository.findByEmail.mockResolvedValue(loginUser);
      userRepository.save.mockImplementation((user: any) => user);

      const result = await service.login({
        email: 'test@example.com',
        password: 'Password123',
      });

      expect(result.accessToken).toBe('test-jwt-token');
      expect(result.user.email).toBe('test@example.com');
      expect(refreshTokenRepository.save).toHaveBeenCalled();
    });

    it('should throw UnauthorizedException for invalid email', async () => {
      userRepository.findByEmail.mockResolvedValue(null);

      await expect(
        service.login({ email: 'wrong@example.com', password: 'pass' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for wrong password', async () => {
      const loginUser = {
        ...mockUser,
        passwordHash: await Password.hash('correct-password', 4),
        get roles() {
          return this.userRoles?.map((ur: any) => ur.role).filter(Boolean) || [];
        },
      };
      userRepository.findByEmail.mockResolvedValue(loginUser);

      await expect(
        service.login({ email: 'test@example.com', password: 'wrong-password' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for deactivated user', async () => {
      userRepository.findByEmail.mockResolvedValue({
        ...mockUser,
        isActive: false,
      });

      await expect(
        service.login({ email: 'test@example.com', password: 'Password123' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('refresh', () => {
    it('should refresh tokens with token rotation', async () => {
      const refreshToken = 'valid-refresh-token';
      jwtService.verify.mockReturnValue({ sub: 'user-uuid-1' });
      refreshTokenRepository.findOne.mockResolvedValue({
        id: 'rt-1',
        userId: 'user-uuid-1',
        tokenHash: 'some-hash',
      });
      const refreshUser = {
        ...mockUser,
        get roles() {
          return this.userRoles?.map((ur: any) => ur.role).filter(Boolean) || [];
        },
      };
      userRepository.findById.mockResolvedValue(refreshUser);

      const result = await service.refresh(refreshToken);

      expect(result.accessToken).toBe('test-jwt-token');
      expect(refreshTokenRepository.findOne).toHaveBeenCalled();
      expect(refreshTokenRepository.remove).toHaveBeenCalled();
      expect(refreshTokenRepository.save).toHaveBeenCalled();
    });

    it('should throw UnauthorizedException for invalid refresh token', async () => {
      jwtService.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await expect(service.refresh('bad-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException if token not found in DB', async () => {
      jwtService.verify.mockReturnValue({ sub: 'user-uuid-1' });
      refreshTokenRepository.findOne.mockResolvedValue(null);

      await expect(service.refresh('some-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException if user not found', async () => {
      jwtService.verify.mockReturnValue({ sub: 'non-existent' });
      refreshTokenRepository.findOne.mockResolvedValue({ id: 'rt-1' });
      userRepository.findById.mockResolvedValue(null);

      await expect(service.refresh('some-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('logout', () => {
    it('should delete all refresh tokens for user', async () => {
      await service.logout('user-uuid-1');

      expect(refreshTokenRepository.delete).toHaveBeenCalledWith({ userId: 'user-uuid-1' });
    });
  });

  describe('forgotPassword', () => {
    it('should set reset token for existing user', async () => {
      userRepository.findByEmail.mockResolvedValue({ ...mockUser });
      userRepository.save.mockImplementation((user: any) => user);
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await service.forgotPassword('test@example.com');

      expect(userRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          passwordResetToken: expect.any(String),
          passwordResetExpires: expect.any(Date),
        }),
      );
      consoleSpy.mockRestore();
    });

    it('should not throw if email does not exist', async () => {
      userRepository.findByEmail.mockResolvedValue(null);
      await expect(
        service.forgotPassword('nonexistent@example.com'),
      ).resolves.not.toThrow();
    });
  });

  describe('resetPassword', () => {
    it('should throw BadRequestException for invalid token', async () => {
      userRepository.findByResetToken.mockResolvedValue(null);

      await expect(
        service.resetPassword('invalid-token', 'NewPassword123'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reset password and revoke tokens', async () => {
      const resetUser = {
        ...mockUser,
        passwordResetToken: 'valid-token',
        passwordResetExpires: new Date(Date.now() + 3600000),
      };
      userRepository.findByResetToken.mockResolvedValue(resetUser);
      userRepository.save.mockImplementation((user: any) => user);

      await service.resetPassword('valid-token', 'NewPassword123');

      expect(userRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          passwordResetToken: null,
          passwordResetExpires: null,
        }),
      );
      expect(refreshTokenRepository.delete).toHaveBeenCalledWith({ userId: 'user-uuid-1' });
    });
  });
});
