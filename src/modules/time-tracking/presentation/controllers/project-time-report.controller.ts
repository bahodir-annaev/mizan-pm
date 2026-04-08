import {
  Controller,
  Get,
  Param,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { TimeTrackingService } from '../../application/services/time-tracking.service';
import { JwtAuthGuard } from '../../../identity/infrastructure/guards/jwt-auth.guard';
import { RolesGuard } from '../../../identity/infrastructure/guards/roles.guard';
import { Roles } from '../../../identity/infrastructure/decorators/roles.decorator';
import { CurrentUser } from '../../../identity/infrastructure/decorators/current-user.decorator';

@ApiTags('Time Reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('projects/:id/time-report')
export class ProjectTimeReportController {
  constructor(private readonly timeTrackingService: TimeTrackingService) {}

  @Get()
  @Roles('manager')
  @ApiOperation({ summary: 'Get aggregated time report for a project' })
  async getReport(
    @Param('id', ParseUUIDPipe) projectId: string,
    @CurrentUser() user: { id: string; roles: string[] },
  ) {
    return this.timeTrackingService.getProjectTimeReport(projectId, user);
  }
}
