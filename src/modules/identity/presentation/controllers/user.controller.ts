import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiProperty,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiNoContentResponse,
  ApiUnauthorizedResponse,
  ApiNotFoundResponse,
  ApiForbiddenResponse,
  ApiBadRequestResponse,
  ApiExtraModels,
  getSchemaPath,
} from '@nestjs/swagger';
import { IsUUID, IsOptional } from 'class-validator';
import { UserService } from '../../application/services/user.service';
import { UpdateUserDto } from '../../application/dtos/update-user.dto';
import { ChangePasswordDto } from '../../application/dtos/change-password.dto';
import { AssignRoleDto } from '../../application/dtos/assign-role.dto';
import { CreateUserDto } from '../../application/dtos/create-user.dto';
import { UpdateUserStatusDto } from '../../application/dtos/update-user-status.dto';
import { UpdatePreferencesDto } from '../../application/dtos/update-preferences.dto';
import { UserResponseDto } from '../../application/dtos/user-response.dto';
import { JwtAuthGuard } from '../../infrastructure/guards/jwt-auth.guard';
import { RolesGuard } from '../../infrastructure/guards/roles.guard';
import { Roles } from '../../infrastructure/decorators/roles.decorator';
import { CurrentUser } from '../../infrastructure/decorators/current-user.decorator';
import { PaginationQueryDto } from '../../../../shared/application/pagination.dto';
import { PaginationMetaResponseDto } from '../../../../shared/application/dtos/pagination-meta-response.dto';

class AssignOrganizationDto {
  @ApiProperty({ nullable: true })
  @IsUUID()
  @IsOptional()
  orgId?: string | null;
}

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('users')
@ApiUnauthorizedResponse({ description: 'Unauthorized' })
@ApiExtraModels(UserResponseDto, PaginationMetaResponseDto)
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post()
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'Create/invite new user (admin/manager)' })
  @ApiCreatedResponse({ type: UserResponseDto })
  @ApiForbiddenResponse({ description: 'Insufficient role' })
  async create(
    @Body() dto: CreateUserDto,
    @CurrentUser() currentUser: any,
  ) {
    return this.userService.create(dto, currentUser.orgId ?? null, currentUser.id);
  }

  @Get()
  @ApiOperation({ summary: 'Get all users (paginated)' })
  @ApiOkResponse({
    schema: {
      properties: {
        items: { type: 'array', items: { $ref: getSchemaPath(UserResponseDto) } },
        meta: { $ref: getSchemaPath(PaginationMetaResponseDto) },
      },
    },
  })
  async findAll(@Query() query: PaginationQueryDto) {
    return this.userService.findAll(query);
  }

  @Get('me')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiOkResponse({ type: UserResponseDto })
  async getMe(@CurrentUser('id') userId: string) {
    return this.userService.findById(userId);
  }

  @Patch('me/password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Change current user password' })
  @ApiOkResponse({ schema: { example: { message: 'Password changed successfully' } } })
  @ApiBadRequestResponse({ description: 'Current password incorrect or validation error' })
  async changePassword(
    @CurrentUser('id') userId: string,
    @Body() dto: ChangePasswordDto,
  ) {
    await this.userService.changePassword(userId, dto);
    return { message: 'Password changed successfully' };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user by ID' })
  @ApiOkResponse({ type: UserResponseDto })
  @ApiNotFoundResponse({ description: 'User not found' })
  async findById(@Param('id', ParseUUIDPipe) id: string) {
    return this.userService.findById(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update user' })
  @ApiOkResponse({ type: UserResponseDto })
  @ApiNotFoundResponse({ description: 'User not found' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserDto,
  ) {
    return this.userService.update(id, dto);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update user online status' })
  @ApiOkResponse({ type: UserResponseDto })
  async updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserStatusDto,
  ) {
    return this.userService.updateStatus(id, dto.status);
  }

  @Put(':id/preferences')
  @ApiOperation({ summary: 'Save user preferences (theme, language, columns)' })
  @ApiOkResponse({ type: UserResponseDto })
  async updatePreferences(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePreferencesDto,
  ) {
    return this.userService.updatePreferences(id, dto.preferences);
  }

  @Patch(':id/organization')
  @Roles('admin')
  @ApiOperation({ summary: 'Assign or remove user organization (admin only)' })
  @ApiOkResponse({ type: UserResponseDto })
  @ApiForbiddenResponse({ description: 'Insufficient role' })
  async assignOrganization(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: AssignOrganizationDto,
  ) {
    return this.userService.assignOrganization(id, body.orgId ?? null);
  }

  @Delete(':id')
  @Roles('admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft delete user (admin only)' })
  @ApiNoContentResponse()
  @ApiForbiddenResponse({ description: 'Insufficient role' })
  async delete(@Param('id', ParseUUIDPipe) id: string) {
    await this.userService.softDelete(id);
  }

  @Get(':id/roles')
  @Roles('admin')
  @ApiOperation({ summary: 'Get user roles (admin+)' })
  @ApiOkResponse({ schema: { type: 'array', items: { type: 'object', properties: { id: { type: 'string' }, name: { type: 'string' } } }, example: [{ id: 'uuid', name: 'manager' }] } })
  async getUserRoles(@Param('id', ParseUUIDPipe) id: string) {
    return this.userService.getUserRoles(id);
  }

  @Post(':id/roles')
  @Roles('admin')
  @ApiOperation({ summary: 'Assign role to user (admin+)' })
  @ApiCreatedResponse({ schema: { type: 'object', properties: { id: { type: 'string' }, name: { type: 'string' } }, example: { id: 'uuid', name: 'manager' } } })
  @ApiForbiddenResponse({ description: 'Insufficient role' })
  async assignRole(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AssignRoleDto,
    @CurrentUser('id') assignedBy: string,
  ) {
    return this.userService.assignRole(id, dto.roleName, assignedBy);
  }

  @Delete(':id/roles/:roleId')
  @Roles('admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove role from user (admin+)' })
  @ApiNoContentResponse()
  @ApiForbiddenResponse({ description: 'Insufficient role' })
  async removeRole(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('roleId') roleName: string,
  ) {
    await this.userService.removeRole(id, roleName);
  }
}
