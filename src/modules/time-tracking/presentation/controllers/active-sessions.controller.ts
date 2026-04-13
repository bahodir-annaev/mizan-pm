import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiOkResponse,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
  ApiExtraModels,
} from '@nestjs/swagger';
import { TimeEntryResponseDto } from '../../application/dtos/time-entry-response.dto';
import { TimeTrackingService } from '../../application/services/time-tracking.service';
import { JwtAuthGuard } from '../../../identity/infrastructure/guards/jwt-auth.guard';
import { RolesGuard } from '../../../identity/infrastructure/guards/roles.guard';
import { Roles } from '../../../identity/infrastructure/decorators/roles.decorator';
import { CurrentUser } from '../../../identity/infrastructure/decorators/current-user.decorator';

@ApiTags('Time Tracking')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('time/active')
@ApiUnauthorizedResponse({ description: 'Unauthorized' })
@ApiExtraModels(TimeEntryResponseDto)
export class ActiveSessionsController {
  constructor(private readonly timeTrackingService: TimeTrackingService) {}

  @Get()
  @Roles('manager')
  @ApiOperation({ summary: 'Get all active time tracking sessions (manager+)' })
  @ApiOkResponse({ type: [TimeEntryResponseDto] })
  @ApiForbiddenResponse({ description: 'Insufficient role' })
  async getAllActive(
    @CurrentUser() user: { id: string; roles: string[] },
  ) {
    return this.timeTrackingService.getAllActiveSessions(user);
  }
}
