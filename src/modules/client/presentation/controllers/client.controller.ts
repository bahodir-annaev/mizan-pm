import {
  Controller,
  Get,
  Post,
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
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ClientService } from '../../application/services/client.service';
import { CreateClientDto } from '../../application/dtos/create-client.dto';
import { UpdateClientDto } from '../../application/dtos/update-client.dto';
import { CreateContactDto } from '../../application/dtos/create-contact.dto';
import { UpdateContactDto } from '../../application/dtos/update-contact.dto';
import { JwtAuthGuard } from '../../../identity/infrastructure/guards/jwt-auth.guard';
import { RolesGuard } from '../../../identity/infrastructure/guards/roles.guard';
import { CurrentUser } from '../../../identity/infrastructure/decorators/current-user.decorator';
import { PaginationQueryDto } from '../../../../shared/application/pagination.dto';

@ApiTags('Clients')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('clients')
export class ClientController {
  constructor(private readonly clientService: ClientService) {}

  @Get()
  @ApiOperation({ summary: 'List clients with search, group filter, and pagination' })
  @ApiQuery({ name: 'search', required: false, description: 'Search clients by name' })
  @ApiQuery({ name: 'group', required: false, description: 'Filter by group label' })
  async findAll(
    @Query() pagination: PaginationQueryDto,
    @Query('search') search?: string,
    @Query('group') group?: string,
  ) {
    return this.clientService.findAll({
      page: pagination.page,
      limit: pagination.limit,
      search,
      group,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get client details with contacts and project count' })
  async findById(@Param('id', ParseUUIDPipe) id: string) {
    return this.clientService.findByIdWithProjectCount(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new client' })
  async create(
    @Body() dto: CreateClientDto,
    @CurrentUser() user: { id: string; roles: string[] },
  ) {
    return this.clientService.create(dto, user);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a client' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateClientDto,
    @CurrentUser() user: { id: string; roles: string[] },
  ) {
    return this.clientService.update(id, dto, user);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft delete a client' })
  async delete(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: { id: string; roles: string[] },
  ) {
    await this.clientService.softDelete(id, user);
  }

  @Patch(':id/favorite')
  @ApiOperation({ summary: 'Toggle client favorite status' })
  async toggleFavorite(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: { id: string; roles: string[] },
  ) {
    return this.clientService.toggleFavorite(id, user);
  }

  // --- Client Projects ---

  @Get(':id/projects')
  @ApiOperation({ summary: 'List projects for a client' })
  async getClientProjects(@Param('id', ParseUUIDPipe) id: string) {
    return this.clientService.getClientProjects(id);
  }

  // --- Contact Person endpoints ---

  @Get(':id/contacts')
  @ApiOperation({ summary: 'List contact persons for a client' })
  async getContacts(@Param('id', ParseUUIDPipe) id: string) {
    return this.clientService.getContacts(id);
  }

  @Post(':id/contacts')
  @ApiOperation({ summary: 'Add a contact person to a client' })
  async addContact(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateContactDto,
    @CurrentUser() user: { id: string; roles: string[] },
  ) {
    return this.clientService.addContact(id, dto, user);
  }

  @Patch(':id/contacts/:contactId')
  @ApiOperation({ summary: 'Update a contact person' })
  async updateContact(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('contactId', ParseUUIDPipe) contactId: string,
    @Body() dto: UpdateContactDto,
    @CurrentUser() user: { id: string; roles: string[] },
  ) {
    return this.clientService.updateContact(id, contactId, dto, user);
  }

  @Delete(':id/contacts/:contactId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove a contact person from a client' })
  async removeContact(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('contactId', ParseUUIDPipe) contactId: string,
    @CurrentUser() user: { id: string; roles: string[] },
  ) {
    await this.clientService.removeContact(id, contactId, user);
  }
}
