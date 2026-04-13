import {
  Controller,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiNoContentResponse,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiExtraModels,
} from '@nestjs/swagger';
import { TimeTrackingService } from '../../application/services/time-tracking.service';
import { TimeEntryResponseDto } from '../../application/dtos/time-entry-response.dto';
import { CreateTimeEntryDto } from '../../application/dtos/create-time-entry.dto';
import { UpdateTimeEntryDto } from '../../application/dtos/update-time-entry.dto';
import { JwtAuthGuard } from '../../../identity/infrastructure/guards/jwt-auth.guard';
import { RolesGuard } from '../../../identity/infrastructure/guards/roles.guard';
import { Roles } from '../../../identity/infrastructure/decorators/roles.decorator';
import { CurrentUser } from '../../../identity/infrastructure/decorators/current-user.decorator';

@ApiTags('Time Entries')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('time-entries')
@ApiUnauthorizedResponse({ description: 'Unauthorized' })
@ApiExtraModels(TimeEntryResponseDto)
export class TimeEntryController {
  constructor(private readonly timeTrackingService: TimeTrackingService) {}

  @Post()
  @Roles('member')
  @ApiOperation({ summary: 'Create a manual time entry' })
  @ApiCreatedResponse({ type: TimeEntryResponseDto })
  @ApiForbiddenResponse({ description: 'Insufficient role' })
  async create(
    @Body() dto: CreateTimeEntryDto,
    @CurrentUser() user: { id: string; roles: string[] },
  ) {
    return this.timeTrackingService.createManualEntry(dto, user);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a time entry (own only)' })
  @ApiOkResponse({ type: TimeEntryResponseDto })
  @ApiNotFoundResponse({ description: 'Time entry not found' })
  @ApiForbiddenResponse({ description: 'Can only edit your own time entries' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTimeEntryDto,
    @CurrentUser() user: { id: string; roles: string[] },
  ) {
    return this.timeTrackingService.updateEntry(id, dto, user);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a time entry (own or manager+)' })
  @ApiNoContentResponse({ description: 'Time entry deleted' })
  @ApiForbiddenResponse({ description: 'Can only delete your own time entries unless manager+' })
  async delete(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: { id: string; roles: string[] },
  ) {
    await this.timeTrackingService.deleteEntry(id, user);
  }
}
