import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

export interface HourlyRateComponents {
  salaryUzs: number;
  bonusUzs: number;
  taxUzs: number;
  jssmUzs: number;
  adminShareUzs: number;
  equipmentShareUzs: number;
  overheadShareUzs: number;
  workingHoursPerMonth: number;
}

export interface ComputedHourlyRate {
  totalMonthlyCostUzs: number;
  hourlyRateUzs: number;
  hourlyRateUsd: number | null;
}

@Injectable()
export class FinanceCalculationService {
  constructor(private readonly dataSource: DataSource) {}

  /** Compute derived fields from raw components. No DB access. */
  computeHourlyRate(
    components: HourlyRateComponents,
    exchangeRate: number | null,
  ): ComputedHourlyRate {
    const totalMonthlyCostUzs =
      components.salaryUzs +
      components.bonusUzs +
      components.taxUzs +
      components.jssmUzs +
      components.adminShareUzs +
      components.equipmentShareUzs +
      components.overheadShareUzs;

    const workingHours = components.workingHoursPerMonth || 176;
    const hourlyRateUzs = totalMonthlyCostUzs / workingHours;
    const hourlyRateUsd = exchangeRate ? hourlyRateUzs / exchangeRate : null;

    return { totalMonthlyCostUzs, hourlyRateUzs, hourlyRateUsd };
  }

  /** Auto-compute tax and JSSM from salary (12% each). */
  computeTaxComponents(salaryUzs: number): { taxUzs: number; jssmUzs: number } {
    return {
      taxUzs: salaryUzs * 0.12,
      jssmUzs: salaryUzs * 0.12,
    };
  }

  /** Compute project MIZAN cost: hours × avg_rate × risk_coefficient */
  computeMizanCost(
    plannedHours: number,
    avgHourlyRateUzs: number,
    riskCoefficient: number,
  ): number {
    return plannedHours * avgHourlyRateUzs * riskCoefficient;
  }

  /** Find the effective hourly rate for a user on a given date (latest effective_date ≤ date). */
  async getEffectiveHourlyRate(
    userId: string,
    date: string,
  ): Promise<{ hourlyRateUzs: number; hourlyRateUsd: number | null } | null> {
    const rows = await this.dataSource.query(
      `SELECT hourly_rate_uzs, hourly_rate_usd
       FROM hourly_rates
       WHERE user_id = $1
         AND effective_date <= $2
         AND deleted_at IS NULL
       ORDER BY effective_date DESC
       LIMIT 1`,
      [userId, date],
    );

    if (!rows.length) return null;
    return {
      hourlyRateUzs: parseFloat(rows[0].hourly_rate_uzs),
      hourlyRateUsd: rows[0].hourly_rate_usd ? parseFloat(rows[0].hourly_rate_usd) : null,
    };
  }

  /** Find the effective exchange rate for an org on a given date (latest rate_date ≤ date). */
  async getEffectiveExchangeRate(
    orgId: string | null,
    date: string,
  ): Promise<number | null> {
    const orgFilter = orgId ? 'AND (org_id = $2 OR org_id IS NULL)' : 'AND org_id IS NULL';
    const params = orgId ? [date, orgId] : [date];

    const rows = await this.dataSource.query(
      `SELECT uzs_per_usd
       FROM exchange_rates
       WHERE rate_date <= $1
         AND deleted_at IS NULL
         ${orgFilter}
       ORDER BY rate_date DESC, org_id NULLS LAST
       LIMIT 1`,
      params,
    );

    return rows.length ? parseFloat(rows[0].uzs_per_usd) : null;
  }

  /** Get total monthly amortization for all active equipment in an org. */
  async getTotalEquipmentAmortization(orgId: string): Promise<number> {
    const rows = await this.dataSource.query(
      `SELECT COALESCE(SUM(monthly_amortization_uzs), 0) AS total
       FROM equipment
       WHERE org_id = $1 AND is_active = true AND deleted_at IS NULL`,
      [orgId],
    );
    return parseFloat(rows[0].total) || 0;
  }

  /** Get total overhead costs for an org in a given month, by category. */
  async getMonthlyOverheadByCategory(
    orgId: string,
    year: number,
    month: number,
  ): Promise<{ category: string; total: number }[]> {
    const rows = await this.dataSource.query(
      `SELECT category, SUM(amount_uzs) AS total
       FROM overhead_costs
       WHERE org_id = $1 AND period_year = $2 AND period_month = $3 AND deleted_at IS NULL
       GROUP BY category`,
      [orgId, year, month],
    );
    return rows.map((r: any) => ({ category: r.category, total: parseFloat(r.total) }));
  }

  /** Count production employees in an org. */
  async countProductionEmployees(orgId: string): Promise<number> {
    const rows = await this.dataSource.query(
      `SELECT COUNT(*) AS cnt
       FROM users
       WHERE org_id = $1
         AND is_active = true
         AND is_production_employee = true
         AND deleted_at IS NULL`,
      [orgId],
    );
    return parseInt(rows[0].cnt, 10) || 1;
  }
}
