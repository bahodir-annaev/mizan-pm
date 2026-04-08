import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Client } from '../../domain/entities/client.entity';
import { ContactPerson } from '../../domain/entities/contact-person.entity';
import { Project } from '../../../project-management/domain/entities/project.entity';
import { CreateClientDto } from '../dtos/create-client.dto';
import { UpdateClientDto } from '../dtos/update-client.dto';
import { CreateContactDto } from '../dtos/create-contact.dto';
import { UpdateContactDto } from '../dtos/update-contact.dto';
import {
  PaginatedResult,
  PaginationMeta,
} from '../../../../shared/application/pagination.dto';

interface ClientQueryParams {
  page: number;
  limit: number;
  search?: string;
  group?: string;
}

interface CurrentUser {
  id: string;
  roles: string[];
}

@Injectable()
export class ClientService {
  constructor(
    @InjectRepository(Client)
    private readonly clientRepo: Repository<Client>,
    @InjectRepository(ContactPerson)
    private readonly contactRepo: Repository<ContactPerson>,
    @InjectRepository(Project)
    private readonly projectRepo: Repository<Project>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  // --- Client CRUD ---

  async create(dto: CreateClientDto, currentUser: CurrentUser): Promise<Client> {
    const client = this.clientRepo.create({
      orgId: dto.orgId ?? null,
      name: dto.name,
      clientType: dto.clientType,
      email: dto.email ?? null,
      phone: dto.phone ?? null,
      address: dto.address ?? null,
      website: dto.website ?? null,
      notes: dto.notes ?? null,
      isFavorite: dto.isFavorite ?? false,
      group: dto.group ?? null,
      createdBy: currentUser.id,
    });

    const saved = await this.clientRepo.save(client);

    this.eventEmitter.emit('client.created', {
      client: saved,
      actorId: currentUser.id,
    });

    return saved;
  }

  async findAll(query: ClientQueryParams): Promise<PaginatedResult<Client>> {
    const skip = (query.page - 1) * query.limit;

    const where: any = {};

    if (query.search) {
      where.name = ILike(`%${query.search}%`);
    }

    if (query.group) {
      where.group = query.group;
    }

    const [clients, total] = await this.clientRepo.findAndCount({
      where,
      relations: ['contacts'],
      order: { createdAt: 'DESC' },
      skip,
      take: query.limit,
    });

    return new PaginatedResult(
      clients,
      new PaginationMeta(query.page, query.limit, total),
    );
  }

  async findById(id: string): Promise<Client> {
    const client = await this.clientRepo.findOne({
      where: { id },
      relations: ['contacts', 'creator'],
    });

    if (!client) {
      throw new NotFoundException('Client not found');
    }

    return client;
  }

  async findByIdWithProjectCount(
    id: string,
  ): Promise<Client & { projectCount: number }> {
    const client = await this.findById(id);

    const projectCount = await this.projectRepo.count({
      where: { clientId: id },
    });

    return Object.assign(client, { projectCount });
  }

  async update(
    id: string,
    dto: UpdateClientDto,
    currentUser: CurrentUser,
  ): Promise<Client> {
    const client = await this.findById(id);

    if (dto.orgId !== undefined) client.orgId = dto.orgId ?? null;
    if (dto.name !== undefined) client.name = dto.name;
    if (dto.clientType !== undefined) client.clientType = dto.clientType;
    if (dto.email !== undefined) client.email = dto.email ?? null;
    if (dto.phone !== undefined) client.phone = dto.phone ?? null;
    if (dto.address !== undefined) client.address = dto.address ?? null;
    if (dto.website !== undefined) client.website = dto.website ?? null;
    if (dto.notes !== undefined) client.notes = dto.notes ?? null;
    if (dto.isFavorite !== undefined) client.isFavorite = dto.isFavorite;
    if (dto.group !== undefined) client.group = dto.group ?? null;

    const saved = await this.clientRepo.save(client);

    this.eventEmitter.emit('client.updated', {
      client: saved,
      actorId: currentUser.id,
      changes: dto,
    });

    return saved;
  }

  async softDelete(id: string, currentUser: CurrentUser): Promise<void> {
    await this.findById(id);
    await this.clientRepo.softDelete(id);

    this.eventEmitter.emit('client.deleted', {
      clientId: id,
      actorId: currentUser.id,
    });
  }

  async toggleFavorite(id: string, currentUser: CurrentUser): Promise<Client> {
    const client = await this.findById(id);
    client.isFavorite = !client.isFavorite;
    return this.clientRepo.save(client);
  }

  // --- Client Projects ---

  async getClientProjects(clientId: string): Promise<Project[]> {
    await this.findById(clientId);
    return this.projectRepo.find({
      where: { clientId },
      order: { createdAt: 'DESC' },
    });
  }

  // --- Contact Person CRUD ---

  async getContacts(clientId: string): Promise<ContactPerson[]> {
    await this.findById(clientId);
    return this.contactRepo.find({
      where: { clientId },
      order: { isPrimary: 'DESC', createdAt: 'ASC' },
    });
  }

  async addContact(
    clientId: string,
    dto: CreateContactDto,
    currentUser: CurrentUser,
  ): Promise<ContactPerson> {
    await this.findById(clientId);

    const contact = this.contactRepo.create({
      clientId,
      name: dto.name,
      email: dto.email ?? null,
      phone: dto.phone ?? null,
      position: dto.position ?? null,
      isPrimary: dto.isPrimary ?? false,
    });

    const saved = await this.contactRepo.save(contact);

    this.eventEmitter.emit('client.contact_added', {
      clientId,
      contact: saved,
      actorId: currentUser.id,
    });

    return saved;
  }

  async updateContact(
    clientId: string,
    contactId: string,
    dto: UpdateContactDto,
    currentUser: CurrentUser,
  ): Promise<ContactPerson> {
    await this.findById(clientId);

    const contact = await this.contactRepo.findOne({
      where: { id: contactId, clientId },
    });

    if (!contact) {
      throw new NotFoundException('Contact person not found');
    }

    if (dto.name !== undefined) contact.name = dto.name;
    if (dto.email !== undefined) contact.email = dto.email ?? null;
    if (dto.phone !== undefined) contact.phone = dto.phone ?? null;
    if (dto.position !== undefined) contact.position = dto.position ?? null;
    if (dto.isPrimary !== undefined) contact.isPrimary = dto.isPrimary;

    return this.contactRepo.save(contact);
  }

  async removeContact(
    clientId: string,
    contactId: string,
    currentUser: CurrentUser,
  ): Promise<void> {
    await this.findById(clientId);

    const contact = await this.contactRepo.findOne({
      where: { id: contactId, clientId },
    });

    if (!contact) {
      throw new NotFoundException('Contact person not found');
    }

    await this.contactRepo.remove(contact);

    this.eventEmitter.emit('client.contact_removed', {
      clientId,
      contactId,
      actorId: currentUser.id,
    });
  }
}
