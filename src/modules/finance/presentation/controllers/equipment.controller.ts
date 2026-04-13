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
import { EquipmentResponseDto } from '../../application/dtos/equipment-response.dto';
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
@ApiUnauthorizedResponse({ description: 'Unauthorized' })
@ApiExtraModels(EquipmentResponseDto)
export class EquipmentController {
  constructor(private readonly service: EquipmentService) {}

  @Get()
  @ApiOperation({ summary: 'List equipment' })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean, description: 'Filter by active/decommissioned status' })
  @ApiOkResponse({ type: [EquipmentResponseDto] })
  async list(
    @CurrentUser() user: any,
    @Query('isActive') isActive?: string,
  ) {
    const active = isActive !== undefined ? isActive === 'true' : undefined;
    return this.service.list(user.orgId, active);
  }

  @Get('amortization-summary')
  @ApiOperation({ summary: 'Total monthly amortization for active equipment' })
  @ApiOkResponse({ schema: { example: { totalMonthlyAmortizationUzs: 12500000 } } })
  async amortizationSummary(@CurrentUser() user: any) {
    return this.service.amortizationSummary(user.orgId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get equipment by ID' })
  @ApiOkResponse({ type: EquipmentResponseDto })
  @ApiNotFoundResponse({ description: 'Equipment not found' })
  async findOne(@Param('id') id: string) {
    return this.service.findById(id);
  }

  @Post()
  @Roles('admin')
  @ApiOperation({ summary: 'Create equipment (auto-calculates monthly amortization)' })
  @ApiCreatedResponse({ type: EquipmentResponseDto })
  @ApiForbiddenResponse({ description: 'Insufficient role' })
  async create(@Body() dto: CreateEquipmentDto, @CurrentUser() user: any) {
    return this.service.create(dto, user.orgId);
  }

  @Patch(':id')
  @Roles('admin')
  @ApiOperation({ summary: 'Update equipment' })
  @ApiOkResponse({ type: EquipmentResponseDto })
  @ApiForbiddenResponse({ description: 'Insufficient role' })
  async update(@Param('id') id: string, @Body() dto: UpdateEquipmentDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @Roles('admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Decommission and delete equipment' })
  @ApiNoContentResponse({ description: 'Equipment deleted' })
  @ApiForbiddenResponse({ description: 'Insufficient role' })
  async remove(@Param('id') id: string) {
    await this.service.remove(id);
  }
}
