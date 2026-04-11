import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { DataSource } from 'typeorm';
import { FinanceCalculationService } from './finance-calculation.service';
import { ProjectFinanceService } from './project-finance.service';

@Injectable()
export class FinanceSchedulerService {
  private readonly logger = new Logger(FinanceSchedulerService.name);

  constructor(
    private readonly calcService: FinanceCalculationService,
    private readonly projectFinanceService: ProjectFinanceService,
    private readonly dataSource: DataSource,
  ) {}

  /** Nightly at 02:00: recalculate hourly rates for all orgs. */
  @Cron('0 2 * * *', { name: 'recalculate-hourly-rates' })
  async recalculateHourlyRates(): Promise<void> {
    this.logger.log('Starting nightly hourly rate recalculation...');
    try {
      const orgs = await this.dataSource.query(
        `SELECT id FROM organizations WHERE deleted_at IS NULL`,
      );

      for (const org of orgs) {
        await this.recalculateHourlyRatesForOrg(org.id);
      }
      this.logger.log('Nightly hourly rate recalculation complete.');
    } catch (err) {
      this.logger.error('Hourly rate recalculation failed', err);
    }
  }

  /** Monthly on the 1st at 03:00: roll up the previous month's costs. */
  @Cron('0 3 1 * *', { name: 'monthly-cost-rollup' })
  async rollUpMonthlyCosts(): Promise<void> {
    const now = new Date();
    const targetDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const year = targetDate.getFullYear();
    const month = targetDate.getMonth() + 1;

    this.logger.log(`Starting monthly cost roll-up for ${year}-${month}...`);
    try {
      const orgs = await this.dataSource.query(
        `SELECT id FROM organizations WHERE deleted_at IS NULL`,
      );

      for (const org of orgs) {
        await this.projectFinanceService.rollUpMonth(org.id, year, month);
      }
      this.logger.log(`Monthly cost roll-up complete for ${year}-${month}.`);
    } catch (err) {
      this.logger.error('Monthly cost roll-up failed', err);
    }
  }

  /** Public method for manual trigger of hourly rate recalculation. */
  async triggerHourlyRateRecalculation(): Promise<void> {
    await this.recalculateHourlyRates();
  }

  /** Public method for manual trigger of monthly cost roll-up. */
  async triggerMonthlyCostRollup(year: number, month: number): Promise<void> {
    const orgs = await this.dataSource.query(
      `SELECT id FROM organizations WHERE deleted_at IS NULL`,
    );
    for (const org of orgs) {
      await this.projectFinanceService.rollUpMonth(org.id, year, month);
    }
  }

  private async recalculateHourlyRatesForOrg(orgId: string): Promise<void> {
    const today = new Date().toISOString().split('T')[0];

    const exchangeRate = await this.calcService.getEffectiveExchangeRate(orgId, today);
    const productionCount = await this.calcService.countProductionEmployees(orgId);
    const totalEquipmentAmort = await this.calcService.getTotalEquipmentAmortization(orgId);

    const now = new Date();
    const overheadByCategory = await this.calcService.getMonthlyOverheadByCategory(
      orgId,
      now.getFullYear(),
      now.getMonth() + 1,
    );

    const adminTotal = overheadByCategory
      .filter((o) => ['RENT', 'UTILITIES', 'INTERNET', 'INSURANCE', 'LEGAL'].includes(o.category))
      .reduce((sum, o) => sum + o.total, 0);

    const otherOverheadTotal = overheadByCategory
      .filter((o) => !['RENT', 'UTILITIES', 'INTERNET', 'INSURANCE', 'LEGAL'].includes(o.category))
      .reduce((sum, o) => sum + o.total, 0);

    const adminShare = adminTotal / productionCount;
    const equipmentShare = totalEquipmentAmort / productionCount;
    const overheadShare = otherOverheadTotal / productionCount;

    // Get all production employees for this org that don't have a rate for today
    const employees = await this.dataSource.query(
      `SELECT u.id, u.salary_uzs
       FROM users u
       WHERE u.org_id = $1
         AND u.is_active = true
         AND u.is_production_employee = true
         AND u.deleted_at IS NULL
         AND u.salary_uzs IS NOT NULL
         AND NOT EXISTS (
           SELECT 1 FROM hourly_rates hr
           WHERE hr.user_id = u.id
             AND hr.effective_date = $2
             AND hr.deleted_at IS NULL
         )`,
      [orgId, today],
    );

    for (const emp of employees) {
      const salary = parseFloat(emp.salary_uzs);
      const { taxUzs, jssmUzs } = this.calcService.computeTaxComponents(salary);

      const computed = this.calcService.computeHourlyRate(
        {
          salaryUzs: salary,
          bonusUzs: 0,
          taxUzs,
          jssmUzs,
          adminShareUzs: adminShare,
          equipmentShareUzs: equipmentShare,
          overheadShareUzs: overheadShare,
          workingHoursPerMonth: 176,
        },
        exchangeRate,
      );

      await this.dataSource.query(
        `INSERT INTO hourly_rates
           (id, user_id, org_id, effective_date,
            salary_uzs, bonus_uzs, tax_uzs, jssm_uzs,
            admin_share_uzs, equipment_share_uzs, overhead_share_uzs,
            total_monthly_cost_uzs, hourly_rate_uzs, hourly_rate_usd,
            exchange_rate_used, production_employee_count, working_hours_per_month,
            created_at, updated_at)
         VALUES (gen_random_uuid(), $1, $2, $3, $4, 0, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, 176, NOW(), NOW())
         ON CONFLICT (user_id, effective_date) DO NOTHING`,
        [
          emp.id, orgId, today,
          salary, taxUzs, jssmUzs,
          adminShare, equipmentShare, overheadShare,
          computed.totalMonthlyCostUzs,
          computed.hourlyRateUzs,
          computed.hourlyRateUsd,
          exchangeRate,
          productionCount,
        ],
      );
    }
  }
}
