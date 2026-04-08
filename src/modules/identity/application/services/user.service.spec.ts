import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import { UserService } from './user.service';
import { Role } from '../../domain/entities/role.entity';
import { UserRole } from '../../domain/entities/user-role.entity';
import { RefreshToken } from '../../domain/entities/refresh-token.entity';
import { User } from '../../domain/entities/user.entity';
import { USER_REPOSITORY } from '../../domain/repositories/user-repository.interface';
import { Password } from '../../domain/value-objects/password.vo';

describe('UserService', () => {
  let service: UserService;
  let userRepository: any;
  let roleRepository: any;
  let userRoleRepository: any;
  let refreshTokenRepository: any;

  const mockRole = { id: 'role-1', name: 'member', permissions: [] };

  const mockUser: Partial<User> = {
    id: 'user-uuid-1',
    email: 'test@example.com',
    passwordHash: 'hashed-password',
    firstName: 'John',
    lastName: 'Doe',
    isActive: true,
    userRoles: [
      { userId: 'user-uuid-1', roleId: 'role-1', role: mockRole, assignedAt: new Date(), assignedBy: null } as any,
    ],
  };

  Object.defineProperty(mockUser, 'roles', {
    get() {
      return this.userRoles?.map((ur: any) => ur.role).filter(Boolean) || [];
    },
    configurable: true,
  });

  beforeEach(async () => {
    userRepository = {
      findByEmail: jest.fn(),
      findById: jest.fn(),
      findAll: jest.fn(),
      save: jest.fn(),
      softDelete: jest.fn(),
      findByResetToken: jest.fn(),
    };

    roleRepository = {
      findOne: jest.fn(),
    };

    userRoleRepository = {
      save: jest.fn(),
      delete: jest.fn(),
      find: jest.fn(),
    };

    refreshTokenRepository = {
      delete: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        { provide: USER_REPOSITORY, useValue: userRepository },
        { provide: getRepositoryToken(Role), useValue: roleRepository },
        { provide: getRepositoryToken(UserRole), useValue: userRoleRepository },
        { provide: getRepositoryToken(RefreshToken), useValue: refreshTokenRepository },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultVal?: any) => {
              const map: Record<string, any> = { BCRYPT_ROUNDS: 4 };
              return map[key] ?? defaultVal;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
  });

  describe('findAll', () => {
    it('should return paginated users', async () => {
      userRepository.findAll.mockResolvedValue([[mockUser], 1]);

      const result = await service.findAll({ page: 1, limit: 20 });

      expect(result.items).toHaveLength(1);
      expect(result.meta.totalItems).toBe(1);
      expect(result.meta.page).toBe(1);
    });
  });

  describe('findById', () => {
    it('should return user when found', async () => {
      userRepository.findById.mockResolvedValue(mockUser);

      const result = await service.findById('user-uuid-1');

      expect(result.email).toBe('test@example.com');
    });

    it('should throw NotFoundException when user not found', async () => {
      userRepository.findById.mockResolvedValue(null);

      await expect(service.findById('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should update user fields', async () => {
      userRepository.findById.mockResolvedValue({ ...mockUser });
      userRepository.save.mockImplementation((user: any) => user);

      const result = await service.update('user-uuid-1', {
        firstName: 'Updated',
      });

      expect(result.firstName).toBe('Updated');
      expect(userRepository.save).toHaveBeenCalled();
    });
  });

  describe('changePassword', () => {
    it('should change password and revoke refresh tokens', async () => {
      const hashed = await Password.hash('CurrentPass123', 4);
      userRepository.findById.mockResolvedValue({
        ...mockUser,
        passwordHash: hashed,
      });
      userRepository.save.mockImplementation((user: any) => user);

      await service.changePassword('user-uuid-1', {
        currentPassword: 'CurrentPass123',
        newPassword: 'NewPass456',
      });

      expect(userRepository.save).toHaveBeenCalled();
      expect(refreshTokenRepository.delete).toHaveBeenCalledWith({ userId: 'user-uuid-1' });
    });

    it('should throw UnauthorizedException for wrong current password', async () => {
      const hashed = await Password.hash('correct-pass', 4);
      userRepository.findById.mockResolvedValue({
        ...mockUser,
        passwordHash: hashed,
      });

      await expect(
        service.changePassword('user-uuid-1', {
          currentPassword: 'wrong-pass',
          newPassword: 'NewPass456',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('softDelete', () => {
    it('should soft delete an existing user', async () => {
      userRepository.findById.mockResolvedValue(mockUser);
      userRepository.softDelete.mockResolvedValue(undefined);

      await service.softDelete('user-uuid-1');

      expect(userRepository.softDelete).toHaveBeenCalledWith('user-uuid-1');
    });

    it('should throw NotFoundException for non-existent user', async () => {
      userRepository.findById.mockResolvedValue(null);

      await expect(service.softDelete('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getUserRoles', () => {
    it('should return user roles with relations', async () => {
      userRepository.findById.mockResolvedValue(mockUser);
      const userRoles = [
        { userId: 'user-uuid-1', roleId: 'role-1', role: mockRole, assignedAt: new Date(), assignedBy: null },
      ];
      userRoleRepository.find.mockResolvedValue(userRoles);

      const result = await service.getUserRoles('user-uuid-1');

      expect(result).toEqual(userRoles);
      expect(userRoleRepository.find).toHaveBeenCalledWith({
        where: { userId: 'user-uuid-1' },
        relations: ['role', 'role.permissions', 'assignedByUser'],
      });
    });
  });

  describe('assignRole', () => {
    it('should assign a role to user via UserRole entity', async () => {
      const userWithMember = {
        ...mockUser,
        userRoles: [
          { userId: 'user-uuid-1', roleId: 'role-1', role: mockRole } as any,
        ],
      };
      Object.defineProperty(userWithMember, 'roles', {
        get() { return this.userRoles?.map((ur: any) => ur.role).filter(Boolean) || []; },
        configurable: true,
      });

      const adminRole = { id: 'role-2', name: 'admin', permissions: [] };
      const updatedUser = {
        ...mockUser,
        userRoles: [
          { userId: 'user-uuid-1', roleId: 'role-1', role: mockRole } as any,
          { userId: 'user-uuid-1', roleId: 'role-2', role: adminRole } as any,
        ],
      };
      Object.defineProperty(updatedUser, 'roles', {
        get() { return this.userRoles?.map((ur: any) => ur.role).filter(Boolean) || []; },
        configurable: true,
      });

      userRepository.findById
        .mockResolvedValueOnce(userWithMember)
        .mockResolvedValueOnce(updatedUser);
      roleRepository.findOne.mockResolvedValue(adminRole);

      const result = await service.assignRole('user-uuid-1', 'admin', 'admin-uuid');

      expect(userRoleRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-uuid-1',
          roleId: 'role-2',
          assignedBy: 'admin-uuid',
        }),
      );
      expect(result.roles).toHaveLength(2);
    });

    it('should not duplicate if role already assigned', async () => {
      const userWithMember = {
        ...mockUser,
        userRoles: [
          { userId: 'user-uuid-1', roleId: 'role-1', role: mockRole } as any,
        ],
      };
      Object.defineProperty(userWithMember, 'roles', {
        get() { return this.userRoles?.map((ur: any) => ur.role).filter(Boolean) || []; },
        configurable: true,
      });

      userRepository.findById.mockResolvedValue(userWithMember);
      roleRepository.findOne.mockResolvedValue(mockRole);

      const result = await service.assignRole('user-uuid-1', 'member');

      expect(userRoleRepository.save).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException for non-existent role', async () => {
      userRepository.findById.mockResolvedValue(mockUser);
      roleRepository.findOne.mockResolvedValue(null);

      await expect(
        service.assignRole('user-uuid-1', 'nonexistent'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('removeRole', () => {
    it('should remove a role from user via userRoleRepository.delete', async () => {
      const adminRole = { id: 'role-2', name: 'admin', permissions: [] };
      const userAfterRemoval = {
        ...mockUser,
        userRoles: [
          { userId: 'user-uuid-1', roleId: 'role-1', role: mockRole } as any,
        ],
      };
      Object.defineProperty(userAfterRemoval, 'roles', {
        get() { return this.userRoles?.map((ur: any) => ur.role).filter(Boolean) || []; },
        configurable: true,
      });

      userRepository.findById
        .mockResolvedValueOnce(mockUser)
        .mockResolvedValueOnce(userAfterRemoval);
      roleRepository.findOne.mockResolvedValue(adminRole);

      const result = await service.removeRole('user-uuid-1', 'admin');

      expect(userRoleRepository.delete).toHaveBeenCalledWith({
        userId: 'user-uuid-1',
        roleId: 'role-2',
      });
      expect(result.roles).toHaveLength(1);
      expect(result.roles[0].name).toBe('member');
    });

    it('should throw NotFoundException for non-existent role', async () => {
      userRepository.findById.mockResolvedValue(mockUser);
      roleRepository.findOne.mockResolvedValue(null);

      await expect(
        service.removeRole('user-uuid-1', 'nonexistent'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
