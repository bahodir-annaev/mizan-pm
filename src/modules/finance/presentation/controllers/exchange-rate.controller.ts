import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Query, UseGuards,
  HttpCode, HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiNoContentResponse,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiExtraModels,
} from '@nestjs/swagger';
import { ExchangeRateResponseDto } from '../../application/dtos/exchange-rate-response.dto';
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
@ApiUnauthorizedResponse({ description: 'Unauthorized' })
@ApiExtraModels(ExchangeRateResponseDto)
export class ExchangeRateController {
  constructor(private readonly service: ExchangeRateService) {}

  @Get()
  @ApiOperation({ summary: 'List exchange rates' })
  @ApiQuery({ name: 'year', required: false, type: Number, description: 'Filter by year' })
  @ApiQuery({ name: 'month', required: false, type: Number, description: 'Filter by month (1–12)' })
  @ApiOkResponse({ type: [ExchangeRateResponseDto] })
  async list(
    @CurrentUser() user: any,
    @Query('year') year?: string,
    @Query('month') month?: string,
  ) {
    return this.service.list(user.orgId, year ? +year : undefined, month ? +month : undefined);
  }

  @Get('latest')
  @ApiOperation({ summary: 'Get most recent exchange rate' })
  @ApiOkResponse({ type: ExchangeRateResponseDto })
  async latest(@CurrentUser() user: any) {
    return this.service.latest(user.orgId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get exchange rate by ID' })
  @ApiOkResponse({ type: ExchangeRateResponseDto })
  @ApiNotFoundResponse({ description: 'Exchange rate not found' })
  async findOne(@Param('id') id: string) {
    return this.service.findById(id);
  }

  @Post()
  @Roles('admin')
  @ApiOperation({ summary: 'Create exchange rate' })
  @ApiCreatedResponse({ type: ExchangeRateResponseDto })
  @ApiForbiddenResponse({ description: 'Insufficient role' })
  async create(@Body() dto: CreateExchangeRateDto, @CurrentUser() user: any) {
    return this.service.create(dto, user.orgId);
  }

  @Patch(':id')
  @Roles('admin')
  @ApiOperation({ summary: 'Update exchange rate' })
  @ApiOkResponse({ type: ExchangeRateResponseDto })
  @ApiForbiddenResponse({ description: 'Insufficient role' })
  async update(@Param('id') id: string, @Body() dto: UpdateExchangeRateDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @Roles('admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete exchange rate' })
  @ApiNoContentResponse({ description: 'Exchange rate deleted' })
  @ApiForbiddenResponse({ description: 'Insufficient role' })
  async remove(@Param('id') id: string) {
    await this.service.remove(id);
  }
}
