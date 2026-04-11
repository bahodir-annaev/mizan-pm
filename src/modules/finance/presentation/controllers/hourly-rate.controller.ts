import {
  Controller, Get, Post, Delete,
  Body, Param, UseGuards,
  HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../identity/infrastructure/guards/jwt-auth.guard';
import { RolesGuard } from '../../../identity/infrastructure/guards/roles.guard';
import { Roles } from '../../../identity/infrastructure/decorators/roles.decorator';
import { CurrentUser } from '../../../identity/infrastructure/decorators/current-user.decorator';
import { HourlyRateService } from '../../application/services/hourly-rate.service';
import { CreateHourlyRateDto } from '../../application/dtos/create-hourly-rate.dto';

@ApiTags('Finance - Hourly Rates')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('manager')
@Controller('finance/hourly-rates')
export class HourlyRateController {
  constructor(private readonly service: HourlyRateService) {}

  @Get()
  @ApiOperation({ summary: 'List current effective rates for all users in org' })
  async listCurrent(@CurrentUser() user: any) {
    return this.service.listCurrent(user.orgId);
  }

  @Get('user/:userId')
  @ApiOperation({ summary: 'Full rate history for a user' })
  async history(@Param('userId') userId: string) {
    return this.service.historyForUser(userId);
  }

  @Get('user/:userId/current')
  @ApiOperation({ summary: 'Current effective rate for a user' })
  async current(@Param('userId') userId: string) {
    return this.service.currentForUser(userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get hourly rate by ID' })
  async findOne(@Param('id') id: string) {
    return this.service.findById(id);
  }

  @Post()
  @Roles('admin')
  @ApiOperation({ summary: 'Create hourly rate (auto-computes tax/jssm/total/rate)' })
  async create(@Body() dto: CreateHourlyRateDto, @CurrentUser() user: any) {
    return this.service.create(dto, user.orgId);
  }

  @Delete(':id')
  @Roles('admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete hourly rate' })
  async remove(@Param('id') id: string) {
    await this.service.remove(id);
  }
}
