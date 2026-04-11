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
import { EquipmentService } from '../../application/services/equipment.service';
import { CreateEquipmentDto } from '../../application/dtos/create-equipment.dto';
import { UpdateEquipmentDto } from '../../application/dtos/update-equipment.dto';

@ApiTags('Finance - Equipment')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('manager')
@Controller('finance/equipment')
export class EquipmentController {
  constructor(private readonly service: EquipmentService) {}

  @Get()
  @ApiOperation({ summary: 'List equipment' })
  async list(
    @CurrentUser() user: any,
    @Query('isActive') isActive?: string,
  ) {
    const active = isActive !== undefined ? isActive === 'true' : undefined;
    return this.service.list(user.orgId, active);
  }

  @Get('amortization-summary')
  @ApiOperation({ summary: 'Total monthly amortization for active equipment' })
  async amortizationSummary(@CurrentUser() user: any) {
    return this.service.amortizationSummary(user.orgId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get equipment by ID' })
  async findOne(@Param('id') id: string) {
    return this.service.findById(id);
  }

  @Post()
  @Roles('admin')
  @ApiOperation({ summary: 'Create equipment (auto-calculates monthly amortization)' })
  async create(@Body() dto: CreateEquipmentDto, @CurrentUser() user: any) {
    return this.service.create(dto, user.orgId);
  }

  @Patch(':id')
  @Roles('admin')
  @ApiOperation({ summary: 'Update equipment' })
  async update(@Param('id') id: string, @Body() dto: UpdateEquipmentDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @Roles('admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Decommission and delete equipment' })
  async remove(@Param('id') id: string) {
    await this.service.remove(id);
  }
}
