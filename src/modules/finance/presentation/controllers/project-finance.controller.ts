import {
  Controller, Get, Post,
  Body, Param, UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
} from '@nestjs/swagger';
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
@ApiUnauthorizedResponse({ description: 'Unauthorized' })
export class ProjectFinanceController {
  constructor(private readonly service: ProjectFinanceService) {}

  @Get(':projectId/plan')
  @ApiOperation({ summary: 'Get current financial plan for a project' })
  @ApiOkResponse({
    schema: {
      example: {
        id: 'uuid', projectId: 'uuid', contractValueUzs: 500000000, contractValueUsd: 45000,
        riskCoefficient: 1.15, plannedCostUzs: 380000000, notes: '', createdAt: '2026-01-01T00:00:00Z',
      },
    },
  })
  @ApiNotFoundResponse({ description: 'No financial plan found for this project' })
  async getCurrentPlan(@Param('projectId') projectId: string) {
    return this.service.getCurrentPlan(projectId);
  }

  @Get(':projectId/plan/history')
  @ApiOperation({ summary: 'Get all plan versions for a project' })
  @ApiOkResponse({
    schema: {
      type: 'array',
      items: {
        example: {
          id: 'uuid', projectId: 'uuid', contractValueUzs: 500000000, contractValueUsd: 45000,
          riskCoefficient: 1.15, plannedCostUzs: 380000000, notes: '', createdAt: '2026-01-01T00:00:00Z',
        },
      },
    },
  })
  async getPlanHistory(@Param('projectId') projectId: string) {
    return this.service.getPlanHistory(projectId);
  }

  @Post(':projectId/plan')
  @ApiOperation({ summary: 'Calculate and save a new financial plan' })
  @ApiCreatedResponse({
    schema: {
      example: {
        id: 'uuid', projectId: 'uuid', contractValueUzs: 500000000, contractValueUsd: 45000,
        riskCoefficient: 1.15, plannedCostUzs: 380000000, notes: '', createdAt: '2026-01-01T00:00:00Z',
      },
    },
  })
  @ApiForbiddenResponse({ description: 'Insufficient role' })
  async createPlan(
    @Param('projectId') projectId: string,
    @Body() dto: CreateProjectFinancialPlanDto,
    @CurrentUser() user: any,
  ) {
    return this.service.createPlan(projectId, dto, user.orgId, user.id);
  }

  @Get(':projectId/monthly-costs')
  @ApiOperation({ summary: 'Get all monthly cost fact rows for a project' })
  @ApiOkResponse({
    schema: {
      type: 'array',
      items: {
        example: {
          id: 'uuid', projectId: 'uuid', year: 2026, month: 4,
          laborCostUzs: 12000000, overheadCostUzs: 3000000, equipmentCostUzs: 1500000,
          totalCostUzs: 16500000, isFinalized: true,
        },
      },
    },
  })
  async getMonthlyCosts(@Param('projectId') projectId: string) {
    return this.service.getMonthlyCosts(projectId);
  }

  @Get(':projectId/monthly-costs/:year/:month')
  @ApiOperation({ summary: 'Get a single month cost breakdown' })
  @ApiOkResponse({
    schema: {
      example: {
        id: 'uuid', projectId: 'uuid', year: 2026, month: 4,
        laborCostUzs: 12000000, overheadCostUzs: 3000000, equipmentCostUzs: 1500000,
        totalCostUzs: 16500000, isFinalized: true,
      },
    },
  })
  @ApiNotFoundResponse({ description: 'No cost data found for this month' })
  async getMonthlyCost(
    @Param('projectId') projectId: string,
    @Param('year') year: string,
    @Param('month') month: string,
  ) {
    return this.service.getMonthlyCost(projectId, +year, +month);
  }

  @Get(':projectId/plan-vs-fact')
  @ApiOperation({ summary: 'Plan vs actual cost summary with burn rate' })
  @ApiOkResponse({
    schema: {
      example: {
        plannedCostUzs: 380000000,
        actualCostUzs: 215000000,
        varianceUzs: 165000000,
        burnRatePct: 56.6,
      },
    },
  })
  async getPlanVsFact(@Param('projectId') projectId: string) {
    return this.service.getPlanVsFact(projectId);
  }
}
