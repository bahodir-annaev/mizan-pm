import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Organization } from './domain/entities/organization.entity';
import { Team } from './domain/entities/team.entity';
import { TeamMembership } from './domain/entities/team-membership.entity';

import { TEAM_REPOSITORY } from './domain/repositories/team-repository.interface';
import { TypeOrmTeamRepository } from './infrastructure/persistence/typeorm-team.repository';

import { OrganizationService } from './application/services/organization.service';
import { TeamService } from './application/services/team.service';

import { OrganizationController } from './presentation/controllers/organization.controller';
import { TeamController } from './presentation/controllers/team.controller';

import { IdentityModule } from '../identity/identity.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Organization, Team, TeamMembership]),
    forwardRef(() => IdentityModule),
  ],
  controllers: [OrganizationController, TeamController],
  providers: [
    OrganizationService,
    TeamService,
    {
      provide: TEAM_REPOSITORY,
      useClass: TypeOrmTeamRepository,
    },
  ],
  exports: [OrganizationService, TeamService, TEAM_REPOSITORY],
})
export class OrganizationModule {}
