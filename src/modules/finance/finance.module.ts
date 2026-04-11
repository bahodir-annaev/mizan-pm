import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import {
  ExchangeRate,
  HourlyRate,
  OverheadCost,
  Equipment,
  ProjectFinancialPlan,
  ProjectMonthlyCost,
  UserMonthlyAllocation,
  TimeEntryCost,
} from './domain/entities';
import { FinanceCalculationService } from './application/services/finance-calculation.service';
import { ExchangeRateService } from './application/services/exchange-rate.service';
import { HourlyRateService } from './application/services/hourly-rate.service';
import { OverheadCostService } from './application/services/overhead-cost.service';
import { EquipmentService } from './application/services/equipment.service';
import { ProjectFinanceService } from './application/services/project-finance.service';
import { FinanceSchedulerService } from './application/services/finance-scheduler.service';
import { ExchangeRateController } from './presentation/controllers/exchange-rate.controller';
import { HourlyRateController } from './presentation/controllers/hourly-rate.controller';
import { OverheadCostController } from './presentation/controllers/overhead-cost.controller';
import { EquipmentController } from './presentation/controllers/equipment.controller';
import { ProjectFinanceController } from './presentation/controllers/project-finance.controller';
import { FinanceRecalculateController } from './presentation/controllers/finance-recalculate.controller';
import { IdentityModule } from '../identity/identity.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ExchangeRate,
      HourlyRate,
      OverheadCost,
      Equipment,
      ProjectFinancialPlan,
      ProjectMonthlyCost,
      UserMonthlyAllocation,
      TimeEntryCost,
    ]),
    ScheduleModule.forRoot(),
    IdentityModule,
  ],
  controllers: [
    ExchangeRateController,
    HourlyRateController,
    OverheadCostController,
    EquipmentController,
    ProjectFinanceController,
    FinanceRecalculateController,
  ],
  providers: [
    FinanceCalculationService,
    ExchangeRateService,
    HourlyRateService,
    OverheadCostService,
    EquipmentService,
    ProjectFinanceService,
    FinanceSchedulerService,
  ],
  exports: [FinanceCalculationService, FinanceSchedulerService],
})
export class FinanceModule {}
