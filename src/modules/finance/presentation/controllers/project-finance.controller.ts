import {
  Controller, Get, Post,
  Body, Param, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../identity/infrastructure/guards/jwt-auth.guard';
import { RolesGuard } from '../../../identity/infrastructure/guards/roles.guard';
import { Roles } from '../../../identity/infrastructure/decorators/roles.decorator';
import { CurrentUser } from '../../../identity/infrastructure/decorators/current-user.decorator';
import { ProjectFinanceService } from '../../application/services/project-finance.service';
import { CreateProjectFinancialPlanDto } from '../../application/dtos/create-project-financial-plan.dto';

@ApiTags('Finance - Projects')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('manager')
@Controller('finance/projects')
export class ProjectFinanceController {
  constructor(private readonly service: ProjectFinanceService) {}

  @Get(':projectId/plan')
  @ApiOperation({ summary: 'Get current financial plan for a project' })
  async getCurrentPlan(@Param('projectId') projectId: string) {
    return this.service.getCurrentPlan(projectId);
  }

  @Get(':projectId/plan/history')
  @ApiOperation({ summary: 'Get all plan versions for a project' })
  async getPlanHistory(@Param('projectId') projectId: string) {
    return this.service.getPlanHistory(projectId);
  }

  @Post(':projectId/plan')
  @ApiOperation({ summary: 'Calculate and save a new financial plan' })
  async createPlan(
    @Param('projectId') projectId: string,
    @Body() dto: CreateProjectFinancialPlanDto,
    @CurrentUser() user: any,
  ) {
    return this.service.createPlan(projectId, dto, user.orgId, user.id);
  }

  @Get(':projectId/monthly-costs')
  @ApiOperation({ summary: 'Get all monthly cost fact rows for a project' })
  async getMonthlyCosts(@Param('projectId') projectId: string) {
    return this.service.getMonthlyCosts(projectId);
  }

  @Get(':projectId/monthly-costs/:year/:month')
  @ApiOperation({ summary: 'Get a single month cost breakdown' })
  async getMonthlyCost(
    @Param('projectId') projectId: string,
    @Param('year') year: string,
    @Param('month') month: string,
  ) {
    return this.service.getMonthlyCost(projectId, +year, +month);
  }

  @Get(':projectId/plan-vs-fact')
  @ApiOperation({ summary: 'Plan vs actual cost summary with burn rate' })
  async getPlanVsFact(@Param('projectId') projectId: string) {
    return this.service.getPlanVsFact(projectId);
  }
}
