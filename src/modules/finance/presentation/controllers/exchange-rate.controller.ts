import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Query, UseGuards,
  HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../identity/infrastructure/guards/jwt-auth.guard';
import { RolesGuard } from '../../../identity/infrastructure/guards/roles.guard';
import { Roles } from '../../../identity/infrastructure/decorators/roles.decorator';
import { CurrentUser } from '../../../identity/infrastructure/decorators/current-user.decorator';
import { ExchangeRateService } from '../../application/services/exchange-rate.service';
import { CreateExchangeRateDto } from '../../application/dtos/create-exchange-rate.dto';
import { UpdateExchangeRateDto } from '../../application/dtos/update-exchange-rate.dto';

@ApiTags('Finance - Exchange Rates')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('member')
@Controller('finance/exchange-rates')
export class ExchangeRateController {
  constructor(private readonly service: ExchangeRateService) {}

  @Get()
  @ApiOperation({ summary: 'List exchange rates' })
  async list(
    @CurrentUser() user: any,
    @Query('year') year?: string,
    @Query('month') month?: string,
  ) {
    return this.service.list(user.orgId, year ? +year : undefined, month ? +month : undefined);
  }

  @Get('latest')
  @ApiOperation({ summary: 'Get most recent exchange rate' })
  async latest(@CurrentUser() user: any) {
    return this.service.latest(user.orgId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get exchange rate by ID' })
  async findOne(@Param('id') id: string) {
    return this.service.findById(id);
  }

  @Post()
  @Roles('admin')
  @ApiOperation({ summary: 'Create exchange rate' })
  async create(@Body() dto: CreateExchangeRateDto, @CurrentUser() user: any) {
    return this.service.create(dto, user.orgId);
  }

  @Patch(':id')
  @Roles('admin')
  @ApiOperation({ summary: 'Update exchange rate' })
  async update(@Param('id') id: string, @Body() dto: UpdateExchangeRateDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @Roles('admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete exchange rate' })
  async remove(@Param('id') id: string) {
    await this.service.remove(id);
  }
}
