import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiOkResponse,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
  ApiExtraModels,
  getSchemaPath,
} from '@nestjs/swagger';
import { ActivityLoggerService } from '../../application/services/activity-logger.service';
import { ActivityLogResponseDto } from '../../application/dtos/activity-log-response.dto';
import { PaginationMetaResponseDto } from '../../application/dtos/pagination-meta-response.dto';
import { ActivityLogFilterDto } from '../../application/dtos/activity-log-filter.dto';
import { JwtAuthGuard } from '../../../modules/identity/infrastructure/guards/jwt-auth.guard';
import { RolesGuard } from '../../../modules/identity/infrastructure/guards/roles.guard';
import { Roles } from '../../../modules/identity/infrastructure/decorators/roles.decorator';

@ApiTags('Activity Log')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
@ApiUnauthorizedResponse({ description: 'Unauthorized' })
@ApiExtraModels(ActivityLogResponseDto, PaginationMetaResponseDto)
export class ActivityLogController {
  constructor(private readonly activityLoggerService: ActivityLoggerService) {}

  @Get('projects/:id/activity')
  @ApiOperation({ summary: 'Get activity log for a project' })
  @ApiOkResponse({
    schema: {
      properties: {
        items: { type: 'array', items: { $ref: getSchemaPath(ActivityLogResponseDto) } },
        meta: { $ref: getSchemaPath(PaginationMetaResponseDto) },
      },
    },
  })
  async getProjectActivity(
    @Param('id', ParseUUIDPipe) projectId: string,
    @Query() query: ActivityLogFilterDto,
  ) {
    return this.activityLoggerService.getProjectActivity(projectId, query);
  }

  @Get('tasks/:id/activity')
  @ApiOperation({ summary: 'Get activity log for a task' })
  @ApiOkResponse({
    schema: {
      properties: {
        items: { type: 'array', items: { $ref: getSchemaPath(ActivityLogResponseDto) } },
        meta: { $ref: getSchemaPath(PaginationMetaResponseDto) },
      },
    },
  })
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
  @ApiOkResponse({
    schema: {
      properties: {
        items: { type: 'array', items: { $ref: getSchemaPath(ActivityLogResponseDto) } },
        meta: { $ref: getSchemaPath(PaginationMetaResponseDto) },
      },
    },
  })
  @ApiForbiddenResponse({ description: 'Insufficient role' })
  async getGlobalActivity(@Query() query: ActivityLogFilterDto) {
    return this.activityLoggerService.getGlobalActivity(query);
  }
}
