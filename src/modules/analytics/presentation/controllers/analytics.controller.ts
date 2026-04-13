import {
  Controller,
  Get,
  Query,
  UseGuards,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
  ApiOkResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AnalyticsService } from '../../application/services/analytics.service';
import { JwtAuthGuard } from '../../../identity/infrastructure/guards/jwt-auth.guard';
import { RolesGuard } from '../../../identity/infrastructure/guards/roles.guard';
import { Roles } from '../../../identity/infrastructure/decorators/roles.decorator';
import { CurrentUser } from '../../../identity/infrastructure/decorators/current-user.decorator';

@ApiTags('Analytics')
@ApiBearerAuth()
@Controller('analytics')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('member')
@ApiUnauthorizedResponse({ description: 'Unauthorized' })
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('overview')
  @ApiOperation({ summary: 'Organization-wide analytics overview (task counts, active users, time logged)' })
  @ApiOkResponse({
    schema: {
      example: {
        totalProjects: 12, activeProjects: 7,
        totalTasks: 254, openTasks: 89, completedTasks: 150,
        activeUsers: 18, totalHoursLogged: 3240.5,
      },
    },
  })
  async getOverview(@CurrentUser() user: any) {
    return this.analyticsService.getOverview(user.orgId);
  }

  @Get('task-completion')
  @ApiOperation({ summary: 'Task completion trend over the past N days' })
  @ApiQuery({ name: 'days', required: false, type: Number, description: 'Number of days to look back (default: 30)' })
  @ApiOkResponse({
    schema: {
      type: 'array',
      items: { example: { date: '2026-04-01', count: 5 } },
    },
  })
  async getTaskCompletion(
    @CurrentUser() user: any,
    @Query('days', new DefaultValuePipe(30), ParseIntPipe) days: number,
  ) {
    return this.analyticsService.getTaskCompletion(user.orgId, days);
  }

  @Get('task-distribution')
  @ApiOperation({ summary: 'Task count distribution by status and priority' })
  @ApiOkResponse({
    schema: {
      example: {
        byStatus: { todo: 40, in_progress: 25, review: 10, done: 150 },
        byPriority: { low: 30, medium: 120, high: 70, critical: 15 },
      },
    },
  })
  async getTaskDistribution(@CurrentUser() user: any) {
    return this.analyticsService.getTaskDistribution(user.orgId);
  }

  @Get('team-performance')
  @ApiOperation({ summary: 'Per-user task completion and time-logged metrics' })
  @ApiOkResponse({
    schema: {
      type: 'array',
      items: { example: { userId: 'uuid', name: 'Jane Doe', completedTasks: 32, hoursLogged: 184.5 } },
    },
  })
  async getTeamPerformance(@CurrentUser() user: any) {
    return this.analyticsService.getTeamPerformance(user.orgId);
  }

  @Get('time-by-project')
  @ApiOperation({ summary: 'Total logged hours grouped by project' })
  @ApiOkResponse({
    schema: {
      type: 'array',
      items: { example: { projectId: 'uuid', projectName: 'Office Build', hours: 420.5 } },
    },
  })
  async getTimeByProject(@CurrentUser() user: any) {
    return this.analyticsService.getTimeByProject(user.orgId);
  }

  @Get('time-by-type')
  @ApiOperation({ summary: 'Logged hours grouped by work type' })
  @ApiOkResponse({
    schema: {
      type: 'array',
      items: { example: { workType: 'design', hours: 210.0 } },
    },
  })
  async getTimeByType(@CurrentUser() user: any) {
    return this.analyticsService.getTimeByType(user.orgId);
  }

  @Get('weekly-productivity')
  @ApiOperation({ summary: 'Logged hours per day-of-week for the current week' })
  @ApiOkResponse({
    schema: {
      example: { Mon: 48.5, Tue: 52.0, Wed: 41.0, Thu: 55.5, Fri: 38.0, Sat: 0, Sun: 0 },
    },
  })
  async getWeeklyProductivity(@CurrentUser() user: any) {
    return this.analyticsService.getWeeklyProductivity(user.orgId);
  }

  @Get('monthly-report')
  @ApiOperation({ summary: 'Monthly summary of tasks and time for a given period' })
  @ApiQuery({ name: 'year', required: false, type: Number, description: 'Year (defaults to current year)' })
  @ApiQuery({ name: 'month', required: false, type: Number, description: 'Month 1–12 (defaults to current month)' })
  @ApiOkResponse({
    schema: {
      example: {
        year: 2026, month: 4,
        tasksCreated: 42, tasksCompleted: 38,
        totalHoursLogged: 620.5, activeUsers: 15,
      },
    },
  })
  async getMonthlyReport(
    @CurrentUser() user: any,
    @Query('year', new DefaultValuePipe(0), ParseIntPipe) year: number,
    @Query('month', new DefaultValuePipe(0), ParseIntPipe) month: number,
  ) {
    return this.analyticsService.getMonthlyReport(
      user.orgId,
      year || undefined,
      month || undefined,
    );
  }

  @Get('time-matrix')
  @ApiOperation({ summary: 'Time-tracking heatmap matrix (user × day) for the past N days' })
  @ApiQuery({ name: 'days', required: false, type: Number, description: 'Number of days to look back (default: 30)' })
  @ApiOkResponse({
    schema: {
      type: 'array',
      items: { example: { userId: 'uuid', name: 'Jane Doe', days: { '2026-04-01': 8.5, '2026-04-02': 6.0 } } },
    },
  })
  async getTimeMatrix(
    @CurrentUser() user: any,
    @Query('days', new DefaultValuePipe(30), ParseIntPipe) days: number,
  ) {
    return this.analyticsService.getTimeMatrix(user.orgId, days);
  }

  @Get('recently-completed')
  @ApiOperation({ summary: 'Most recently completed tasks' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Maximum number of tasks to return (default: 10)' })
  @ApiOkResponse({
    schema: {
      type: 'array',
      items: { example: { id: 'uuid', title: 'Task A', projectId: 'uuid', completedAt: '2026-04-10T14:00:00Z' } },
    },
  })
  async getRecentlyCompleted(
    @CurrentUser() user: any,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    return this.analyticsService.getRecentlyCompleted(user.orgId, limit);
  }

  @Get('finance-overview')
  @Roles('manager')
  @ApiOperation({ summary: 'Finance overview: total costs, revenue, and margin for a period (manager+)' })
  @ApiQuery({ name: 'year', required: false, type: Number, description: 'Year (defaults to current year)' })
  @ApiQuery({ name: 'month', required: false, type: Number, description: 'Month 1–12 (defaults to current month)' })
  @ApiOkResponse({
    schema: {
      example: {
        year: 2026, month: 4,
        totalCostUzs: 48000000, totalRevenueUzs: 72000000,
        grossMarginUzs: 24000000, marginPct: 33.3,
      },
    },
  })
  async getFinanceOverview(
    @CurrentUser() user: any,
    @Query('year', new DefaultValuePipe(0), ParseIntPipe) year: number,
    @Query('month', new DefaultValuePipe(0), ParseIntPipe) month: number,
  ) {
    return this.analyticsService.getFinanceOverview(user.orgId, year || undefined, month || undefined);
  }

  @Get('project-profitability')
  @Roles('manager')
  @ApiOperation({ summary: 'Profitability metrics per project (manager+)' })
  @ApiQuery({ name: 'status', required: false, type: String, description: 'Filter by project status' })
  @ApiOkResponse({
    schema: {
      type: 'array',
      items: {
        example: {
          projectId: 'uuid', projectName: 'Office Build',
          revenueUzs: 72000000, costUzs: 48000000, marginPct: 33.3,
        },
      },
    },
  })
  async getProjectProfitability(
    @CurrentUser() user: any,
    @Query('status') status?: string,
  ) {
    return this.analyticsService.getProjectProfitability(user.orgId, status);
  }

  @Get('employee-cost-breakdown')
  @Roles('manager')
  @ApiOperation({ summary: 'Per-employee cost breakdown for a period (manager+)' })
  @ApiQuery({ name: 'year', required: false, type: Number, description: 'Year (defaults to current year)' })
  @ApiQuery({ name: 'month', required: false, type: Number, description: 'Month 1–12 (defaults to current month)' })
  @ApiOkResponse({
    schema: {
      type: 'array',
      items: {
        example: {
          userId: 'uuid', name: 'Jane Doe',
          salaryUzs: 8000000, taxUzs: 1600000, jssmUzs: 400000,
          overheadShareUzs: 900000, equipmentShareUzs: 300000, totalCostUzs: 11200000,
        },
      },
    },
  })
  async getEmployeeCostBreakdown(
    @CurrentUser() user: any,
    @Query('year', new DefaultValuePipe(0), ParseIntPipe) year: number,
    @Query('month', new DefaultValuePipe(0), ParseIntPipe) month: number,
  ) {
    return this.analyticsService.getEmployeeCostBreakdown(user.orgId, year || undefined, month || undefined);
  }

  @Get('plan-vs-fact')
  @Roles('manager')
  @ApiOperation({ summary: 'Planned vs actual cost comparison per project (manager+)' })
  @ApiQuery({ name: 'status', required: false, type: String, description: 'Filter by project status' })
  @ApiOkResponse({
    schema: {
      type: 'array',
      items: {
        example: {
          projectId: 'uuid', projectName: 'Office Build',
          plannedCostUzs: 380000000, actualCostUzs: 215000000,
          varianceUzs: 165000000, burnRatePct: 56.6,
        },
      },
    },
  })
  async getPlanVsFact(
    @CurrentUser() user: any,
    @Query('status') status?: string,
  ) {
    return this.analyticsService.getPlanVsFact(user.orgId, status);
  }

  @Get('department-cost')
  @Roles('manager')
  @ApiOperation({ summary: 'Cost breakdown by department/team for a period (manager+)' })
  @ApiQuery({ name: 'year', required: false, type: Number, description: 'Year (defaults to current year)' })
  @ApiQuery({ name: 'month', required: false, type: Number, description: 'Month 1–12 (defaults to current month)' })
  @ApiOkResponse({
    schema: {
      type: 'array',
      items: { example: { department: 'Engineering', totalCostUzs: 32000000 } },
    },
  })
  async getDepartmentCost(
    @CurrentUser() user: any,
    @Query('year', new DefaultValuePipe(0), ParseIntPipe) year: number,
    @Query('month', new DefaultValuePipe(0), ParseIntPipe) month: number,
  ) {
    return this.analyticsService.getDepartmentCost(user.orgId, year || undefined, month || undefined);
  }
}
