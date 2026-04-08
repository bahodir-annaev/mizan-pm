import {
  Controller,
  Get,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { TimeTrackingService } from '../../application/services/time-tracking.service';
import { TimeEntryFilterDto } from '../../application/dtos/time-entry-filter.dto';
import { JwtAuthGuard } from '../../../identity/infrastructure/guards/jwt-auth.guard';
import { CurrentUser } from '../../../identity/infrastructure/decorators/current-user.decorator';

@ApiTags('User Time')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users/me/time')
export class UserTimeController {
  constructor(private readonly timeTrackingService: TimeTrackingService) {}

  @Get()
  @ApiOperation({ summary: 'Get current user time entries' })
  async getMyEntries(
    @Query() query: TimeEntryFilterDto,
    @CurrentUser() user: { id: string; roles: string[] },
  ) {
    return this.timeTrackingService.getMyTimeEntries(user, query);
  }

  @Get('active')
  @ApiOperation({ summary: 'Get currently running timer' })
  async getActive(
    @CurrentUser() user: { id: string; roles: string[] },
  ) {
    return this.timeTrackingService.getActiveTimer(user);
  }
}
