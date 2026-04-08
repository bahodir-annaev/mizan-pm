import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

import { User } from './domain/entities/user.entity';
import { Role } from './domain/entities/role.entity';
import { Permission } from './domain/entities/permission.entity';
import { UserRole } from './domain/entities/user-role.entity';
import { RefreshToken } from './domain/entities/refresh-token.entity';

import { USER_REPOSITORY } from './domain/repositories/user-repository.interface';
import { TypeOrmUserRepository } from './infrastructure/persistence/typeorm-user.repository';

import { AuthService } from './application/services/auth.service';
import { UserService } from './application/services/user.service';

import { JwtStrategy } from './infrastructure/strategies/jwt.strategy';
import { LocalStrategy } from './infrastructure/strategies/local.strategy';

import { JwtAuthGuard } from './infrastructure/guards/jwt-auth.guard';
import { RolesGuard } from './infrastructure/guards/roles.guard';
import { PermissionsGuard } from './infrastructure/guards/permissions.guard';

import { AuthController } from './presentation/controllers/auth.controller';
import { UserController } from './presentation/controllers/user.controller';

import { OrganizationModule } from '../organization/organization.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Role, Permission, UserRole, RefreshToken]),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: config.get<string>('JWT_ACCESS_EXPIRATION', '15m') as any,
        },
      }),
    }),
    forwardRef(() => OrganizationModule),
  ],
  controllers: [AuthController, UserController],
  providers: [
    AuthService,
    UserService,
    JwtStrategy,
    LocalStrategy,
    JwtAuthGuard,
    RolesGuard,
    PermissionsGuard,
    {
      provide: USER_REPOSITORY,
      useClass: TypeOrmUserRepository,
    },
  ],
  exports: [
    AuthService,
    UserService,
    JwtAuthGuard,
    RolesGuard,
    PermissionsGuard,
    USER_REPOSITORY,
  ],
})
export class IdentityModule {}
