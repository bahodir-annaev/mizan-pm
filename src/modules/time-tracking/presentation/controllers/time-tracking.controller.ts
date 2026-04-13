import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiExtraModels,
  getSchemaPath,
} from '@nestjs/swagger';
import { TimeTrackingService } from '../../application/services/time-tracking.service';
import { TimeEntryFilterDto } from '../../application/dtos/time-entry-filter.dto';
import { TimeEntryResponseDto } from '../../application/dtos/time-entry-response.dto';
import { PaginationMetaResponseDto } from '../../../../shared/application/dtos/pagination-meta-response.dto';
import { JwtAuthGuard } from '../../../identity/infrastructure/guards/jwt-auth.guard';
import { RolesGuard } from '../../../identity/infrastructure/guards/roles.guard';
import { Roles } from '../../../identity/infrastructure/decorators/roles.decorator';
import { CurrentUser } from '../../../identity/infrastructure/decorators/current-user.decorator';

@ApiTags('Time Tracking')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('tasks/:taskId/time')
@ApiUnauthorizedResponse({ description: 'Unauthorized' })
@ApiExtraModels(TimeEntryResponseDto, PaginationMetaResponseDto)
export class TimeTrackingController {
  constructor(private readonly timeTrackingService: TimeTrackingService) {}

  @Get()
  @ApiOperation({ summary: 'Get time entries for a task' })
  @ApiOkResponse({
    schema: {
      properties: {
        items: { type: 'array', items: { $ref: getSchemaPath(TimeEntryResponseDto) } },
        meta: { $ref: getSchemaPath(PaginationMetaResponseDto) },
      },
    },
  })
  @ApiNotFoundResponse({ description: 'Task not found' })
  async getByTask(
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @Query() query: TimeEntryFilterDto,
  ) {
    return this.timeTrackingService.getTimeEntriesByTask(taskId, query);
  }

  @Post('start')
  @Roles('member')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Start a timer on a task' })
  @ApiQuery({ name: 'force', required: false, type: Boolean, description: 'Force stop active timer and start new one' })
  @ApiCreatedResponse({ type: TimeEntryResponseDto })
  @ApiForbiddenResponse({ description: 'Insufficient role' })
  async start(
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @Query('force') force: string | undefined,
    @CurrentUser() user: { id: string; roles: string[] },
  ) {
    return this.timeTrackingService.startTimer(
      taskId,
      user,
      force === 'true',
    );
  }

  @Post('stop')
  @Roles('member')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Stop the active timer on a task' })
  @ApiOkResponse({ type: TimeEntryResponseDto })
  @ApiForbiddenResponse({ description: 'Insufficient role or no active timer for this task' })
  async stop(
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @CurrentUser() user: { id: string; roles: string[] },
  ) {
    return this.timeTrackingService.stopTimer(taskId, user);
  }
}
