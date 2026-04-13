import {
  Controller,
  Get,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiOkResponse,
  ApiUnauthorizedResponse,
  ApiExtraModels,
  getSchemaPath,
} from '@nestjs/swagger';
import { TimeTrackingService } from '../../application/services/time-tracking.service';
import { TimeEntryFilterDto } from '../../application/dtos/time-entry-filter.dto';
import { TimeEntryResponseDto } from '../../application/dtos/time-entry-response.dto';
import { PaginationMetaResponseDto } from '../../../../shared/application/dtos/pagination-meta-response.dto';
import { JwtAuthGuard } from '../../../identity/infrastructure/guards/jwt-auth.guard';
import { CurrentUser } from '../../../identity/infrastructure/decorators/current-user.decorator';

@ApiTags('User Time')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users/me/time')
@ApiUnauthorizedResponse({ description: 'Unauthorized' })
@ApiExtraModels(TimeEntryResponseDto, PaginationMetaResponseDto)
export class UserTimeController {
  constructor(private readonly timeTrackingService: TimeTrackingService) {}

  @Get()
  @ApiOperation({ summary: 'Get current user time entries' })
  @ApiOkResponse({
    schema: {
      properties: {
        items: { type: 'array', items: { $ref: getSchemaPath(TimeEntryResponseDto) } },
        meta: { $ref: getSchemaPath(PaginationMetaResponseDto) },
      },
    },
  })
  async getMyEntries(
    @Query() query: TimeEntryFilterDto,
    @CurrentUser() user: { id: string; roles: string[] },
  ) {
    return this.timeTrackingService.getMyTimeEntries(user, query);
  }

  @Get('active')
  @ApiOperation({ summary: 'Get currently running timer' })
  @ApiOkResponse({ type: TimeEntryResponseDto, description: 'Returns the active time entry, or null if no timer is running' })
  async getActive(
    @CurrentUser() user: { id: string; roles: string[] },
  ) {
    return this.timeTrackingService.getActiveTimer(user);
  }
}
