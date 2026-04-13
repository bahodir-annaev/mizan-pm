import {
  Controller,
  Get,
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
  ApiOkResponse,
  ApiNoContentResponse,
  ApiUnauthorizedResponse,
  ApiNotFoundResponse,
  ApiForbiddenResponse,
} from '@nestjs/swagger';
import { OrganizationService } from '../../application/services/organization.service';
import { UpdateOrganizationDto } from '../../application/dtos/update-organization.dto';
import { OrganizationResponseDto } from '../../application/dtos/organization-response.dto';
import { JwtAuthGuard } from '../../../identity/infrastructure/guards/jwt-auth.guard';
import { RolesGuard } from '../../../identity/infrastructure/guards/roles.guard';
import { Roles } from '../../../identity/infrastructure/decorators/roles.decorator';

@ApiTags('Organizations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('organizations')
@ApiUnauthorizedResponse({ description: 'Unauthorized' })
export class OrganizationController {
  constructor(private readonly organizationService: OrganizationService) {}

  @Get(':id')
  @ApiOperation({ summary: 'Get organization by ID' })
  @ApiOkResponse({ type: OrganizationResponseDto })
  @ApiNotFoundResponse({ description: 'Organization not found' })
  async findById(@Param('id', ParseUUIDPipe) id: string) {
    return this.organizationService.findById(id);
  }

  @Patch(':id')
  @Roles('admin')
  @ApiOperation({ summary: 'Update organization (admin only)' })
  @ApiOkResponse({ type: OrganizationResponseDto })
  @ApiForbiddenResponse({ description: 'Insufficient role' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateOrganizationDto,
  ) {
    return this.organizationService.update(id, dto);
  }

  @Delete(':id')
  @Roles('admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete organization (admin only)' })
  @ApiNoContentResponse()
  @ApiForbiddenResponse({ description: 'Insufficient role' })
  async delete(@Param('id', ParseUUIDPipe) id: string) {
    await this.organizationService.softDelete(id);
  }
}
