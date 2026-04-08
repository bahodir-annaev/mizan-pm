import { Module } from '@nestjs/common';
import { AnalyticsService } from './application/services/analytics.service';
import { AnalyticsController } from './presentation/controllers/analytics.controller';
import { BudgetController } from './presentation/controllers/budget.controller';
import { IdentityModule } from '../identity/identity.module';
import { OrganizationModule } from '../organization/organization.module';

@Module({
  imports: [IdentityModule, OrganizationModule],
  controllers: [AnalyticsController, BudgetController],
  providers: [AnalyticsService],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
