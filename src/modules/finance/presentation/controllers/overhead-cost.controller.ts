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
import { OverheadCostResponseDto } from '../../application/dtos/overhead-cost-response.dto';
import { JwtAuthGuard } from '../../../identity/infrastructure/guards/jwt-auth.guard';
import { RolesGuard } from '../../../identity/infrastructure/guards/roles.guard';
import { Roles } from '../../../identity/infrastructure/decorators/roles.decorator';
import { CurrentUser } from '../../../identity/infrastructure/decorators/current-user.decorator';
import { OverheadCostService } from '../../application/services/overhead-cost.service';
import { OverheadCategory } from '../../domain/entities/overhead-category.enum';
import { CreateOverheadCostDto } from '../../application/dtos/create-overhead-cost.dto';
import { UpdateOverheadCostDto } from '../../application/dtos/update-overhead-cost.dto';

@ApiTags('Finance - Overhead Costs')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('manager')
@Controller('finance/overhead-costs')
@ApiUnauthorizedResponse({ description: 'Unauthorized' })
@ApiExtraModels(OverheadCostResponseDto)
export class OverheadCostController {
  constructor(private readonly service: OverheadCostService) {}

  @Get()
  @ApiOperation({ summary: 'List overhead costs' })
  @ApiQuery({ name: 'year', required: false, type: Number })
  @ApiQuery({ name: 'month', required: false, type: Number })
  @ApiQuery({ name: 'category', required: false, enum: OverheadCategory })
  @ApiOkResponse({ type: [OverheadCostResponseDto] })
  async list(
    @CurrentUser() user: any,
    @Query('year') year?: string,
    @Query('month') month?: string,
    @Query('category') category?: OverheadCategory,
  ) {
    return this.service.list(user.orgId, year ? +year : undefined, month ? +month : undefined, category);
  }

  @Get('summary')
  @ApiOperation({ summary: 'Aggregated overhead totals per category for a period' })
  @ApiQuery({ name: 'year', required: true, type: Number })
  @ApiQuery({ name: 'month', required: true, type: Number })
  @ApiOkResponse({
    schema: {
      example: {
        rent: 5000000,
        utilities: 1200000,
        software: 800000,
        other: 300000,
      },
    },
  })
  async summary(
    @CurrentUser() user: any,
    @Query('year') year: string,
    @Query('month') month: string,
  ) {
    return this.service.summary(user.orgId, +year, +month);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get overhead cost by ID' })
  @ApiOkResponse({ type: OverheadCostResponseDto })
  @ApiNotFoundResponse({ description: 'Overhead cost not found' })
  async findOne(@Param('id') id: string) {
    return this.service.findById(id);
  }

  @Post()
  @Roles('admin')
  @ApiOperation({ summary: 'Create overhead cost entry' })
  @ApiCreatedResponse({ type: OverheadCostResponseDto })
  @ApiForbiddenResponse({ description: 'Insufficient role' })
  async create(@Body() dto: CreateOverheadCostDto, @CurrentUser() user: any) {
    return this.service.create(dto, user.orgId);
  }

  @Patch(':id')
  @Roles('admin')
  @ApiOperation({ summary: 'Update overhead cost entry' })
  @ApiOkResponse({ type: OverheadCostResponseDto })
  @ApiForbiddenResponse({ description: 'Insufficient role' })
  async update(@Param('id') id: string, @Body() dto: UpdateOverheadCostDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @Roles('admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete overhead cost entry' })
  @ApiNoContentResponse({ description: 'Overhead cost deleted' })
  @ApiForbiddenResponse({ description: 'Insufficient role' })
  async remove(@Param('id') id: string) {
    await this.service.remove(id);
  }
}
