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
import { ApiTags, ApiOperation, ApiBearerAuth, ApiProperty } from '@nestjs/swagger';
import { IsUUID, IsOptional } from 'class-validator';
import { UserService } from '../../application/services/user.service';
import { UpdateUserDto } from '../../application/dtos/update-user.dto';
import { ChangePasswordDto } from '../../application/dtos/change-password.dto';
import { AssignRoleDto } from '../../application/dtos/assign-role.dto';
import { CreateUserDto } from '../../application/dtos/create-user.dto';
import { UpdateUserStatusDto } from '../../application/dtos/update-user-status.dto';
import { UpdatePreferencesDto } from '../../application/dtos/update-preferences.dto';
import { JwtAuthGuard } from '../../infrastructure/guards/jwt-auth.guard';
import { RolesGuard } from '../../infrastructure/guards/roles.guard';
import { Roles } from '../../infrastructure/decorators/roles.decorator';
import { CurrentUser } from '../../infrastructure/decorators/current-user.decorator';
import { PaginationQueryDto } from '../../../../shared/application/pagination.dto';

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
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post()
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'Create/invite new user (admin/manager)' })
  async create(
    @Body() dto: CreateUserDto,
    @CurrentUser() currentUser: any,
  ) {
    return this.userService.create(dto, currentUser.orgId ?? null, currentUser.id);
  }

  @Get()
  @Roles('admin')
  @ApiOperation({ summary: 'Get all users (paginated, admin+)' })
  async findAll(@Query() query: PaginationQueryDto) {
    return this.userService.findAll(query);
  }

  // Static routes MUST come before parameterized :id routes
  @Get('me')
  @ApiOperation({ summary: 'Get current user profile' })
  async getMe(@CurrentUser('id') userId: string) {
    return this.userService.findById(userId);
  }

  @Patch('me/password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Change current user password' })
  async changePassword(
    @CurrentUser('id') userId: string,
    @Body() dto: ChangePasswordDto,
  ) {
    await this.userService.changePassword(userId, dto);
    return { message: 'Password changed successfully' };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user by ID' })
  async findById(@Param('id', ParseUUIDPipe) id: string) {
    return this.userService.findById(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update user' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserDto,
  ) {
    return this.userService.update(id, dto);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update user online status' })
  async updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserStatusDto,
  ) {
    return this.userService.updateStatus(id, dto.status);
  }

  @Put(':id/preferences')
  @ApiOperation({ summary: 'Save user preferences (theme, language, columns)' })
  async updatePreferences(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePreferencesDto,
  ) {
    return this.userService.updatePreferences(id, dto.preferences);
  }

  @Patch(':id/organization')
  @Roles('admin')
  @ApiOperation({ summary: 'Assign or remove user organization (admin only)' })
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
  async delete(@Param('id', ParseUUIDPipe) id: string) {
    await this.userService.softDelete(id);
  }

  @Get(':id/roles')
  @Roles('admin')
  @ApiOperation({ summary: 'Get user roles (admin+)' })
  async getUserRoles(@Param('id', ParseUUIDPipe) id: string) {
    return this.userService.getUserRoles(id);
  }

  @Post(':id/roles')
  @Roles('admin')
  @ApiOperation({ summary: 'Assign role to user (admin+)' })
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
  async removeRole(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('roleId') roleName: string,
  ) {
    await this.userService.removeRole(id, roleName);
  }
}
