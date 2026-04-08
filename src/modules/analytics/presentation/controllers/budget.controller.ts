import {
  Controller,
  Get,
  Patch,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { DataSource } from 'typeorm';
import { JwtAuthGuard } from '../../../identity/infrastructure/guards/jwt-auth.guard';
import { RolesGuard } from '../../../identity/infrastructure/guards/roles.guard';
import { Roles } from '../../../identity/infrastructure/decorators/roles.decorator';
import { CurrentUser } from '../../../identity/infrastructure/decorators/current-user.decorator';
import { OrganizationService } from '../../../organization/application/services/organization.service';

@ApiTags('Budget')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('budget')
export class BudgetController {
  constructor(
    private readonly dataSource: DataSource,
    private readonly organizationService: OrganizationService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get organization budget overview' })
  async getBudgetOverview(@CurrentUser() user: any) {
    const orgId = user.orgId;
    if (!orgId) {
      return { limit: null, used: 0, remaining: null };
    }

    const org = await this.organizationService.findById(orgId);
    const result = await this.dataSource.query(
      `SELECT COALESCE(SUM(budget), 0) as used FROM projects WHERE org_id = $1 AND deleted_at IS NULL`,
      [orgId],
    );
    const used = parseFloat(result[0]?.used || '0');
    const limit = org.budgetLimit ? parseFloat(String(org.budgetLimit)) : null;
    const remaining = limit !== null ? limit - used : null;

    return { limit, used, remaining };
  }

  @Patch('limit')
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update organization budget limit (admin only)' })
  async updateBudgetLimit(
    @CurrentUser() user: any,
    @Body() body: { budgetLimit: number },
  ) {
    const orgId = user.orgId;
    if (!orgId) {
      return { message: 'No organization associated' };
    }
    return this.organizationService.update(orgId, { budgetLimit: body.budgetLimit });
  }
}
