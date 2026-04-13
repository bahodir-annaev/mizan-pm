import {
  Controller, Post,
  Body, Param, UseGuards,
  HttpCode, HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiOkResponse,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../identity/infrastructure/guards/jwt-auth.guard';
import { RolesGuard } from '../../../identity/infrastructure/guards/roles.guard';
import { Roles } from '../../../identity/infrastructure/decorators/roles.decorator';
import { CurrentUser } from '../../../identity/infrastructure/decorators/current-user.decorator';
import { FinanceSchedulerService } from '../../application/services/finance-scheduler.service';
import { ProjectFinanceService } from '../../application/services/project-finance.service';
import { RecalculateMonthlyCostsDto } from '../../application/dtos/recalculate-monthly-costs.dto';

@ApiTags('Finance - Recalculate')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('finance/recalculate')
@ApiUnauthorizedResponse({ description: 'Unauthorized' })
export class FinanceRecalculateController {
  constructor(
    private readonly scheduler: FinanceSchedulerService,
    private readonly projectFinanceService: ProjectFinanceService,
  ) {}

  @Post('hourly-rates')
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Manually trigger nightly hourly rate recalculation' })
  @ApiOkResponse({ description: 'Recalculation triggered', schema: { example: { message: 'Hourly rate recalculation triggered' } } })
  @ApiForbiddenResponse({ description: 'Insufficient role' })
  async triggerHourlyRates() {
    await this.scheduler.triggerHourlyRateRecalculation();
    return { message: 'Hourly rate recalculation triggered' };
  }

  @Post('monthly-costs')
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Manually trigger monthly cost roll-up for a specific period' })
  @ApiOkResponse({ description: 'Roll-up triggered', schema: { example: { message: 'Monthly costs rolled up for 2026-4' } } })
  @ApiForbiddenResponse({ description: 'Insufficient role' })
  async triggerMonthlyCosts(@Body() dto: RecalculateMonthlyCostsDto) {
    await this.scheduler.triggerMonthlyCostRollup(dto.year, dto.month);
    return { message: `Monthly costs rolled up for ${dto.year}-${dto.month}` };
  }

  @Post('project/:projectId')
  @Roles('manager')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Recalculate plan and unfinalized costs for a project' })
  @ApiOkResponse({ description: 'Recalculation triggered', schema: { example: { message: 'Project costs recalculated for 2026-4' } } })
  @ApiForbiddenResponse({ description: 'Insufficient role' })
  async triggerProjectRecalculate(
    @Param('projectId') projectId: string,
    @CurrentUser() user: any,
    @Body() dto: RecalculateMonthlyCostsDto,
  ) {
    await this.projectFinanceService.rollUpMonth(user.orgId, dto.year, dto.month);
    return { message: `Project costs recalculated for ${dto.year}-${dto.month}` };
  }
}
