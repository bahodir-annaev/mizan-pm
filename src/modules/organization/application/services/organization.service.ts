import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Organization } from '../../domain/entities/organization.entity';
import { CreateOrganizationDto } from '../dtos/create-organization.dto';
import { UpdateOrganizationDto } from '../dtos/update-organization.dto';

@Injectable()
export class OrganizationService {
  constructor(
    @InjectRepository(Organization)
    private readonly orgRepo: Repository<Organization>,
  ) {}

  async create(dto: CreateOrganizationDto): Promise<Organization> {
    const slug = dto.slug || this.generateSlug(dto.name);

    const existing = await this.orgRepo.findOne({ where: { slug } });
    if (existing) {
      throw new ConflictException('Organization slug already taken');
    }

    const org = new Organization();
    org.name = dto.name;
    org.slug = slug;
    org.logoUrl = dto.logoUrl ?? null;
    org.budgetLimit = dto.budgetLimit ?? null;
    org.settings = null;

    return this.orgRepo.save(org);
  }

  async findById(id: string): Promise<Organization> {
    const org = await this.orgRepo.findOne({ where: { id } });
    if (!org) {
      throw new NotFoundException('Organization not found');
    }
    return org;
  }

  async findBySlug(slug: string): Promise<Organization> {
    const org = await this.orgRepo.findOne({ where: { slug } });
    if (!org) {
      throw new NotFoundException('Organization not found');
    }
    return org;
  }

  async update(id: string, dto: UpdateOrganizationDto): Promise<Organization> {
    const org = await this.findById(id);
    if (dto.name !== undefined) org.name = dto.name;
    if (dto.logoUrl !== undefined) org.logoUrl = dto.logoUrl;
    if (dto.budgetLimit !== undefined) org.budgetLimit = dto.budgetLimit;
    if (dto.settings !== undefined) org.settings = dto.settings;
    return this.orgRepo.save(org);
  }

  async softDelete(id: string): Promise<void> {
    await this.findById(id);
    await this.orgRepo.softDelete(id);
  }

  /** Create an org from just a name (used during registration) */
  async createFromName(name: string): Promise<Organization> {
    return this.create({ name });
  }

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
}
