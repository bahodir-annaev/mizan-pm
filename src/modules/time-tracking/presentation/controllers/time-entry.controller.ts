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
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { TimeTrackingService } from '../../application/services/time-tracking.service';
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
export class TimeEntryController {
  constructor(private readonly timeTrackingService: TimeTrackingService) {}

  @Post()
  @Roles('member')
  @ApiOperation({ summary: 'Create a manual time entry' })
  async create(
    @Body() dto: CreateTimeEntryDto,
    @CurrentUser() user: { id: string; roles: string[] },
  ) {
    return this.timeTrackingService.createManualEntry(dto, user);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a time entry (own only)' })
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
  async delete(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: { id: string; roles: string[] },
  ) {
    await this.timeTrackingService.deleteEntry(id, user);
  }
}
