import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, IsNull } from 'typeorm';
import { ProjectFinancialPlan } from '../../domain/entities/project-financial-plan.entity';
import { ProjectMonthlyCost } from '../../domain/entities/project-monthly-cost.entity';
import { UserMonthlyAllocation } from '../../domain/entities/user-monthly-allocation.entity';
import { CreateProjectFinancialPlanDto } from '../dtos/create-project-financial-plan.dto';
import { FinanceCalculationService } from './finance-calculation.service';

@Injectable()
export class ProjectFinanceService {
  constructor(
    @InjectRepository(ProjectFinancialPlan)
    private readonly planRepo: Repository<ProjectFinancialPlan>,
    @InjectRepository(ProjectMonthlyCost)
    private readonly monthlyCostRepo: Repository<ProjectMonthlyCost>,
    @InjectRepository(UserMonthlyAllocation)
    private readonly allocationRepo: Repository<UserMonthlyAllocation>,
    private readonly calcService: FinanceCalculationService,
    private readonly dataSource: DataSource,
  ) {}

  async getCurrentPlan(projectId: string): Promise<ProjectFinancialPlan | null> {
    return this.planRepo.findOne({
      where: { projectId, isCurrent: true, deletedAt: IsNull() },
    });
  }

  async getPlanHistory(projectId: string): Promise<ProjectFinancialPlan[]> {
    return this.planRepo.find({
      where: { projectId, deletedAt: IsNull() },
      order: { version: 'DESC' },
    });
  }

  async createPlan(
    projectId: string,
    dto: CreateProjectFinancialPlanDto,
    orgId: string | null,
    calculatedBy: string,
  ): Promise<ProjectFinancialPlan> {
    // Fetch project + assigned users' current hourly rates
    const projectRows = await this.dataSource.query(
      `SELECT COALESCE(SUM(t.estimated_hours), 0) AS planned_hours
       FROM tasks t
       WHERE t.project_id = $1 AND t.deleted_at IS NULL`,
      [projectId],
    );
    const plannedHours = parseFloat(projectRows[0].planned_hours) || 0;

    // Weighted average hourly rate of users assigned to project tasks
    const rateRows = await this.dataSource.query(
      `SELECT AVG(hr.hourly_rate_uzs) AS avg_rate
       FROM task_assignees ta
       JOIN tasks t ON t.id = ta.task_id
       LEFT JOIN LATERAL (
         SELECT hourly_rate_uzs FROM hourly_rates
         WHERE user_id = ta.user_id AND effective_date <= CURRENT_DATE AND deleted_at IS NULL
         ORDER BY effective_date DESC LIMIT 1
       ) hr ON true
       WHERE t.project_id = $1 AND t.deleted_at IS NULL AND hr.hourly_rate_uzs IS NOT NULL`,
      [projectId],
    );

    const avgRate = parseFloat(rateRows[0]?.avg_rate) || 0;
    const riskCoeff = dto.riskCoefficient ?? 1.15;
    const mizanCostUzs = this.calcService.computeMizanCost(plannedHours, avgRate, riskCoeff);

    const today = new Date().toISOString().split('T')[0];
    const exchangeRate = orgId
      ? await this.calcService.getEffectiveExchangeRate(orgId, today)
      : null;

    const contractValueUzs = dto.contractValueUzs ?? null;
    const plannedProfitUzs = contractValueUzs != null ? contractValueUzs - mizanCostUzs : null;
    const plannedMarginPct =
      contractValueUzs && contractValueUzs > 0
        ? (plannedProfitUzs! / contractValueUzs) * 100
        : null;

    // Mark previous plan as not current
    await this.planRepo.update(
      { projectId, isCurrent: true },
      { isCurrent: false },
    );

    // Determine next version
    const existing = await this.planRepo.count({ where: { projectId, deletedAt: IsNull() } });

    const plan = this.planRepo.create({
      projectId,
      orgId,
      version: existing + 1,
      isCurrent: true,
      contractSignedDate: dto.contractSignedDate ?? null,
      contractValueUzs,
      contractValueUsd: dto.contractValueUsd ?? null,
      plannedHoursTotal: plannedHours,
      avgHourlyRateUzs: avgRate,
      riskCoefficient: riskCoeff,
      mizanCostUzs,
      mizanCostUsd: exchangeRate ? mizanCostUzs / exchangeRate : null,
      plannedProfitUzs,
      plannedMarginPct,
      exchangeRateAtSigning: exchangeRate,
      calculatedBy,
      notes: dto.notes ?? null,
    });

    return this.planRepo.save(plan);
  }

  async getMonthlyCosts(projectId: string): Promise<ProjectMonthlyCost[]> {
    return this.monthlyCostRepo.find({
      where: { projectId, deletedAt: IsNull() },
      order: { periodYear: 'DESC', periodMonth: 'DESC' },
    });
  }

  async getMonthlyCost(
    projectId: string,
    year: number,
    month: number,
  ): Promise<ProjectMonthlyCost | null> {
    return this.monthlyCostRepo.findOne({
      where: { projectId, periodYear: year, periodMonth: month, deletedAt: IsNull() },
    });
  }

  async getPlanVsFact(projectId: string): Promise<{
    plan: ProjectFinancialPlan | null;
    factToDateUzs: number;
    remainingUzs: number | null;
    burnRateUzs: number | null;
    estimatedFinalCostUzs: number | null;
  }> {
    const plan = await this.getCurrentPlan(projectId);

    const factRows = await this.dataSource.query(
      `SELECT COALESCE(SUM(total_cost_uzs), 0) AS fact_total
       FROM project_monthly_costs
       WHERE project_id = $1 AND deleted_at IS NULL`,
      [projectId],
    );
    const factToDateUzs = parseFloat(factRows[0].fact_total) || 0;

    const monthCountRows = await this.dataSource.query(
      `SELECT COUNT(DISTINCT (period_year, period_month)) AS month_count
       FROM project_monthly_costs
       WHERE project_id = $1 AND deleted_at IS NULL`,
      [projectId],
    );
    const monthCount = parseInt(monthCountRows[0].month_count, 10) || 1;

    const burnRateUzs = factToDateUzs / monthCount;

    const progressRows = await this.dataSource.query(
      `SELECT progress FROM projects WHERE id = $1`,
      [projectId],
    );
    const progress = progressRows[0]?.progress || 0;

    const estimatedFinalCostUzs =
      progress > 0 ? (factToDateUzs / progress) * 100 : null;

    const remainingUzs = plan ? plan.mizanCostUzs - factToDateUzs : null;

    return { plan, factToDateUzs, remainingUzs, burnRateUzs, estimatedFinalCostUzs };
  }

  /** Roll up a specific month for all projects in an org. Called by cron and manual trigger. */
  async rollUpMonth(orgId: string, year: number, month: number): Promise<void> {
    const lastDay = new Date(year, month, 0).getDate();
    const monthEnd = `${year}-${String(month).padStart(2, '0')}-${lastDay}`;

    // Get all time entries grouped by user + project for this month
    const entries = await this.dataSource.query(
      `SELECT
         te.user_id,
         COALESCE(te.project_id, t.project_id) AS project_id,
         SUM(COALESCE(te.hours, te.duration_seconds / 3600.0, 0)) AS total_hours
       FROM time_entries te
       LEFT JOIN tasks t ON t.id = te.task_id
       WHERE EXTRACT(YEAR FROM COALESCE(te.date::date, te.start_time)) = $1
         AND EXTRACT(MONTH FROM COALESCE(te.date::date, te.start_time)) = $2
         AND (te.project_id IS NOT NULL OR t.project_id IS NOT NULL)
       GROUP BY te.user_id, COALESCE(te.project_id, t.project_id)`,
      [year, month],
    );

    const exchangeRate = await this.calcService.getEffectiveExchangeRate(orgId, monthEnd);

    for (const row of entries) {
      const { user_id: userId, project_id: projectId } = row;
      const hoursLogged = parseFloat(row.total_hours) || 0;
      if (hoursLogged === 0) continue;

      const rateRow = await this.calcService.getEffectiveHourlyRate(userId, monthEnd);
      if (!rateRow) continue;

      const costUzs = hoursLogged * rateRow.hourlyRateUzs;
      const costUsd = exchangeRate ? costUzs / exchangeRate : null;

      // Upsert user_monthly_allocation
      await this.dataSource.query(
        `INSERT INTO user_monthly_allocation
           (id, user_id, project_id, org_id, period_year, period_month,
            hours_logged, hourly_rate_uzs_snapshot, cost_uzs, cost_usd,
            exchange_rate_snapshot, is_finalized, calculated_at, created_at, updated_at)
         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, true, NOW(), NOW(), NOW())
         ON CONFLICT (user_id, project_id, period_year, period_month)
         DO UPDATE SET
           hours_logged = EXCLUDED.hours_logged,
           hourly_rate_uzs_snapshot = EXCLUDED.hourly_rate_uzs_snapshot,
           cost_uzs = EXCLUDED.cost_uzs,
           cost_usd = EXCLUDED.cost_usd,
           exchange_rate_snapshot = EXCLUDED.exchange_rate_snapshot,
           is_finalized = true,
           calculated_at = NOW(),
           updated_at = NOW()`,
        [userId, projectId, orgId, year, month, hoursLogged, rateRow.hourlyRateUzs, costUzs, costUsd, exchangeRate],
      );
    }

    // Roll up to project_monthly_costs
    const projectSummaries = await this.dataSource.query(
      `SELECT project_id,
              SUM(hours_logged) AS total_hours,
              SUM(cost_uzs) AS total_cost_uzs,
              SUM(cost_usd) AS total_cost_usd,
              COUNT(DISTINCT user_id)::int AS employee_count,
              SUM(cost_uzs) / NULLIF(SUM(hours_logged), 0) AS avg_hourly_rate_uzs
       FROM user_monthly_allocation
       WHERE org_id = $1 AND period_year = $2 AND period_month = $3
       GROUP BY project_id`,
      [orgId, year, month],
    );

    for (const s of projectSummaries) {
      await this.dataSource.query(
        `INSERT INTO project_monthly_costs
           (id, project_id, org_id, period_year, period_month,
            total_hours, total_cost_uzs, total_cost_usd, employee_count,
            avg_hourly_rate_uzs, is_finalized, calculated_at, created_at, updated_at)
         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, true, NOW(), NOW(), NOW())
         ON CONFLICT (project_id, period_year, period_month)
         DO UPDATE SET
           total_hours = EXCLUDED.total_hours,
           total_cost_uzs = EXCLUDED.total_cost_uzs,
           total_cost_usd = EXCLUDED.total_cost_usd,
           employee_count = EXCLUDED.employee_count,
           avg_hourly_rate_uzs = EXCLUDED.avg_hourly_rate_uzs,
           is_finalized = true,
           calculated_at = NOW(),
           updated_at = NOW()`,
        [s.project_id, orgId, year, month, s.total_hours, s.total_cost_uzs, s.total_cost_usd, s.employee_count, s.avg_hourly_rate_uzs],
      );
    }
  }
}
