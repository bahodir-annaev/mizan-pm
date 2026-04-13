import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiOkResponse,
  ApiParam,
  ApiUnauthorizedResponse,
  ApiExtraModels,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../identity/infrastructure/guards/jwt-auth.guard';
import { TimeTrackingService } from '../../application/services/time-tracking.service';
import { TimeEntryResponseDto } from '../../application/dtos/time-entry-response.dto';

@ApiTags('Time Tracking')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@ApiUnauthorizedResponse({ description: 'Unauthorized' })
@ApiExtraModels(TimeEntryResponseDto)
@Controller('time/tasks')
export class TaskActiveTimerController {
  constructor(private readonly timeTrackingService: TimeTrackingService) {}

  @Get(':taskId/active')
  @ApiParam({ name: 'taskId', type: 'string' })
  @ApiOperation({ summary: 'Get active time tracking sessions for a specific task' })
  @ApiOkResponse({ type: [TimeEntryResponseDto] })
  async getActiveForTask(@Param('taskId') taskId: string) {
    return this.timeTrackingService.getActiveTimerForTask(taskId);
  }
}
