import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ActivityLoggerService } from '../../application/services/activity-logger.service';
import { ActivityLogFilterDto } from '../../application/dtos/activity-log-filter.dto';
import { JwtAuthGuard } from '../../../modules/identity/infrastructure/guards/jwt-auth.guard';
import { RolesGuard } from '../../../modules/identity/infrastructure/guards/roles.guard';
import { Roles } from '../../../modules/identity/infrastructure/decorators/roles.decorator';

@ApiTags('Activity Log')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class ActivityLogController {
  constructor(private readonly activityLoggerService: ActivityLoggerService) {}

  @Get('projects/:id/activity')
  @ApiOperation({ summary: 'Get activity log for a project' })
  async getProjectActivity(
    @Param('id', ParseUUIDPipe) projectId: string,
    @Query() query: ActivityLogFilterDto,
  ) {
    return this.activityLoggerService.getProjectActivity(projectId, query);
  }

  @Get('tasks/:id/activity')
  @ApiOperation({ summary: 'Get activity log for a task' })
  async getTaskActivity(
    @Param('id', ParseUUIDPipe) taskId: string,
    @Query() query: ActivityLogFilterDto,
  ) {
    return this.activityLoggerService.getEntityActivity('task', taskId, query);
  }

  @Get('activity')
  @UseGuards(RolesGuard)
  @Roles('admin', 'owner')
  @ApiOperation({ summary: 'Get global activity feed (admin+ only)' })
  async getGlobalActivity(@Query() query: ActivityLogFilterDto) {
    return this.activityLoggerService.getGlobalActivity(query);
  }
}
