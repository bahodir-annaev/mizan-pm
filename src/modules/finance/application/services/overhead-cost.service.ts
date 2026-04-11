import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { OverheadCost } from '../../domain/entities/overhead-cost.entity';
import { OverheadCategory } from '../../domain/entities/overhead-category.enum';
import { CreateOverheadCostDto } from '../dtos/create-overhead-cost.dto';
import { UpdateOverheadCostDto } from '../dtos/update-overhead-cost.dto';

@Injectable()
export class OverheadCostService {
  constructor(
    @InjectRepository(OverheadCost)
    private readonly repo: Repository<OverheadCost>,
  ) {}

  async list(
    orgId: string,
    year?: number,
    month?: number,
    category?: OverheadCategory,
  ): Promise<OverheadCost[]> {
    const qb = this.repo.createQueryBuilder('oc')
      .where('oc.org_id = :orgId AND oc.deleted_at IS NULL', { orgId });

    if (year) qb.andWhere('oc.period_year = :year', { year });
    if (month) qb.andWhere('oc.period_month = :month', { month });
    if (category) qb.andWhere('oc.category = :category', { category });

    return qb.orderBy('oc.period_year', 'DESC').addOrderBy('oc.period_month', 'DESC').getMany();
  }

  async summary(orgId: string, year: number, month: number): Promise<{ category: string; total: number }[]> {
    const rows = await this.repo.query(
      `SELECT category, SUM(amount_uzs)::float AS total
       FROM overhead_costs
       WHERE org_id = $1 AND period_year = $2 AND period_month = $3 AND deleted_at IS NULL
       GROUP BY category
       ORDER BY category`,
      [orgId, year, month],
    );
    return rows;
  }

  async findById(id: string): Promise<OverheadCost> {
    const cost = await this.repo.findOne({ where: { id, deletedAt: IsNull() } });
    if (!cost) throw new NotFoundException('Overhead cost not found');
    return cost;
  }

  async create(dto: CreateOverheadCostDto, orgId: string): Promise<OverheadCost> {
    const cost = this.repo.create({
      orgId,
      periodYear: dto.periodYear,
      periodMonth: dto.periodMonth,
      category: dto.category,
      amountUzs: dto.amountUzs,
      description: dto.description ?? null,
    });
    return this.repo.save(cost);
  }

  async update(id: string, dto: UpdateOverheadCostDto): Promise<OverheadCost> {
    const cost = await this.findById(id);
    if (dto.amountUzs !== undefined) cost.amountUzs = dto.amountUzs;
    if (dto.description !== undefined) cost.description = dto.description;
    return this.repo.save(cost);
  }

  async remove(id: string): Promise<void> {
    await this.findById(id);
    await this.repo.softDelete(id);
  }
}
