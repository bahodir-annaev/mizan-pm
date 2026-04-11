import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { Equipment } from '../../domain/entities/equipment.entity';
import { CreateEquipmentDto } from '../dtos/create-equipment.dto';
import { UpdateEquipmentDto } from '../dtos/update-equipment.dto';

@Injectable()
export class EquipmentService {
  constructor(
    @InjectRepository(Equipment)
    private readonly repo: Repository<Equipment>,
  ) {}

  async list(orgId: string, isActive?: boolean): Promise<Equipment[]> {
    const qb = this.repo.createQueryBuilder('eq')
      .where('eq.org_id = :orgId AND eq.deleted_at IS NULL', { orgId });

    if (isActive !== undefined) qb.andWhere('eq.is_active = :isActive', { isActive });

    return qb.orderBy('eq.name', 'ASC').getMany();
  }

  async amortizationSummary(orgId: string): Promise<{ total: number; itemCount: number }> {
    const rows = await this.repo.query(
      `SELECT COALESCE(SUM(monthly_amortization_uzs), 0)::float AS total, COUNT(*)::int AS item_count
       FROM equipment
       WHERE org_id = $1 AND is_active = true AND deleted_at IS NULL`,
      [orgId],
    );
    return { total: rows[0].total, itemCount: rows[0].item_count };
  }

  async findById(id: string): Promise<Equipment> {
    const eq = await this.repo.findOne({ where: { id, deletedAt: IsNull() } });
    if (!eq) throw new NotFoundException('Equipment not found');
    return eq;
  }

  async create(dto: CreateEquipmentDto, orgId: string): Promise<Equipment> {
    const monthlyAmortization =
      (dto.purchaseCostUzs - (dto.residualValueUzs ?? 0)) / dto.usefulLifeMonths;

    const eq = this.repo.create({
      orgId,
      name: dto.name,
      category: dto.category ?? null,
      purchaseDate: dto.purchaseDate,
      purchaseCostUzs: dto.purchaseCostUzs,
      usefulLifeMonths: dto.usefulLifeMonths,
      monthlyAmortizationUzs: monthlyAmortization,
      residualValueUzs: dto.residualValueUzs ?? 0,
      serialNumber: dto.serialNumber ?? null,
      notes: dto.notes ?? null,
      isActive: true,
    });
    return this.repo.save(eq);
  }

  async update(id: string, dto: UpdateEquipmentDto): Promise<Equipment> {
    const eq = await this.findById(id);
    if (dto.name !== undefined) eq.name = dto.name;
    if (dto.category !== undefined) eq.category = dto.category;
    if (dto.serialNumber !== undefined) eq.serialNumber = dto.serialNumber;
    if (dto.notes !== undefined) eq.notes = dto.notes;

    if (dto.isActive !== undefined) {
      eq.isActive = dto.isActive;
      if (!dto.isActive && !eq.decommissionDate) {
        eq.decommissionDate = new Date().toISOString().split('T')[0];
      }
    }

    if (dto.decommissionDate !== undefined) eq.decommissionDate = dto.decommissionDate;

    return this.repo.save(eq);
  }

  async remove(id: string): Promise<void> {
    const eq = await this.findById(id);
    eq.isActive = false;
    if (!eq.decommissionDate) eq.decommissionDate = new Date().toISOString().split('T')[0];
    await this.repo.save(eq);
    await this.repo.softDelete(id);
  }
}
