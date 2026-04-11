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
import { OverheadCostService } from '../../application/services/overhead-cost.service';
import { OverheadCategory } from '../../domain/entities/overhead-category.enum';
import { CreateOverheadCostDto } from '../../application/dtos/create-overhead-cost.dto';
import { UpdateOverheadCostDto } from '../../application/dtos/update-overhead-cost.dto';

@ApiTags('Finance - Overhead Costs')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('manager')
@Controller('finance/overhead-costs')
export class OverheadCostController {
  constructor(private readonly service: OverheadCostService) {}

  @Get()
  @ApiOperation({ summary: 'List overhead costs' })
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
  async summary(
    @CurrentUser() user: any,
    @Query('year') year: string,
    @Query('month') month: string,
  ) {
    return this.service.summary(user.orgId, +year, +month);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get overhead cost by ID' })
  async findOne(@Param('id') id: string) {
    return this.service.findById(id);
  }

  @Post()
  @Roles('admin')
  @ApiOperation({ summary: 'Create overhead cost entry' })
  async create(@Body() dto: CreateOverheadCostDto, @CurrentUser() user: any) {
    return this.service.create(dto, user.orgId);
  }

  @Patch(':id')
  @Roles('admin')
  @ApiOperation({ summary: 'Update overhead cost entry' })
  async update(@Param('id') id: string, @Body() dto: UpdateOverheadCostDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @Roles('admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete overhead cost entry' })
  async remove(@Param('id') id: string) {
    await this.service.remove(id);
  }
}
