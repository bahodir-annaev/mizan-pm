import {
  Controller,
  Get,
  Query,
  UseGuards,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { AnalyticsService } from '../../application/services/analytics.service';
import { JwtAuthGuard } from '../../../identity/infrastructure/guards/jwt-auth.guard';
import { RolesGuard } from '../../../identity/infrastructure/guards/roles.guard';
import { Roles } from '../../../identity/infrastructure/decorators/roles.decorator';
import { CurrentUser } from '../../../identity/infrastructure/decorators/current-user.decorator';

@Controller('analytics')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('member')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('overview')
  async getOverview(@CurrentUser() user: any) {
    return this.analyticsService.getOverview(user.orgId);
  }

  @Get('task-completion')
  async getTaskCompletion(
    @CurrentUser() user: any,
    @Query('days', new DefaultValuePipe(30), ParseIntPipe) days: number,
  ) {
    return this.analyticsService.getTaskCompletion(user.orgId, days);
  }

  @Get('task-distribution')
  async getTaskDistribution(@CurrentUser() user: any) {
    return this.analyticsService.getTaskDistribution(user.orgId);
  }

  @Get('team-performance')
  async getTeamPerformance(@CurrentUser() user: any) {
    return this.analyticsService.getTeamPerformance(user.orgId);
  }

  @Get('time-by-project')
  async getTimeByProject(@CurrentUser() user: any) {
    return this.analyticsService.getTimeByProject(user.orgId);
  }

  @Get('time-by-type')
  async getTimeByType(@CurrentUser() user: any) {
    return this.analyticsService.getTimeByType(user.orgId);
  }

  @Get('weekly-productivity')
  async getWeeklyProductivity(@CurrentUser() user: any) {
    return this.analyticsService.getWeeklyProductivity(user.orgId);
  }

  @Get('monthly-report')
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
  async getTimeMatrix(
    @CurrentUser() user: any,
    @Query('days', new DefaultValuePipe(30), ParseIntPipe) days: number,
  ) {
    return this.analyticsService.getTimeMatrix(user.orgId, days);
  }

  @Get('recently-completed')
  async getRecentlyCompleted(
    @CurrentUser() user: any,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    return this.analyticsService.getRecentlyCompleted(user.orgId, limit);
  }

  @Get('finance-overview')
  @Roles('manager')
  async getFinanceOverview(
    @CurrentUser() user: any,
    @Query('year', new DefaultValuePipe(0), ParseIntPipe) year: number,
    @Query('month', new DefaultValuePipe(0), ParseIntPipe) month: number,
  ) {
    return this.analyticsService.getFinanceOverview(user.orgId, year || undefined, month || undefined);
  }

  @Get('project-profitability')
  @Roles('manager')
  async getProjectProfitability(
    @CurrentUser() user: any,
    @Query('status') status?: string,
  ) {
    return this.analyticsService.getProjectProfitability(user.orgId, status);
  }

  @Get('employee-cost-breakdown')
  @Roles('manager')
  async getEmployeeCostBreakdown(
    @CurrentUser() user: any,
    @Query('year', new DefaultValuePipe(0), ParseIntPipe) year: number,
    @Query('month', new DefaultValuePipe(0), ParseIntPipe) month: number,
  ) {
    return this.analyticsService.getEmployeeCostBreakdown(user.orgId, year || undefined, month || undefined);
  }

  @Get('plan-vs-fact')
  @Roles('manager')
  async getPlanVsFact(
    @CurrentUser() user: any,
    @Query('status') status?: string,
  ) {
    return this.analyticsService.getPlanVsFact(user.orgId, status);
  }

  @Get('department-cost')
  @Roles('manager')
  async getDepartmentCost(
    @CurrentUser() user: any,
    @Query('year', new DefaultValuePipe(0), ParseIntPipe) year: number,
    @Query('month', new DefaultValuePipe(0), ParseIntPipe) month: number,
  ) {
    return this.analyticsService.getDepartmentCost(user.orgId, year || undefined, month || undefined);
  }
}
