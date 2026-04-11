import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { ExchangeRate } from '../../domain/entities/exchange-rate.entity';
import { CreateExchangeRateDto } from '../dtos/create-exchange-rate.dto';
import { UpdateExchangeRateDto } from '../dtos/update-exchange-rate.dto';

@Injectable()
export class ExchangeRateService {
  constructor(
    @InjectRepository(ExchangeRate)
    private readonly repo: Repository<ExchangeRate>,
  ) {}

  async list(orgId: string | null, year?: number, month?: number): Promise<ExchangeRate[]> {
    const qb = this.repo.createQueryBuilder('er')
      .where('er.deleted_at IS NULL')
      .andWhere('(er.org_id = :orgId OR er.org_id IS NULL)', { orgId: orgId ?? null });

    if (year && month) {
      const start = `${year}-${String(month).padStart(2, '0')}-01`;
      const end = `${year}-${String(month).padStart(2, '0')}-31`;
      qb.andWhere('er.rate_date BETWEEN :start AND :end', { start, end });
    }

    return qb.orderBy('er.rate_date', 'DESC').getMany();
  }

  async latest(orgId: string | null): Promise<ExchangeRate | null> {
    return this.repo.findOne({
      where: [
        { orgId: orgId ?? undefined, deletedAt: IsNull() },
        { orgId: IsNull(), deletedAt: IsNull() },
      ],
      order: { rateDate: 'DESC' },
    });
  }

  async findById(id: string): Promise<ExchangeRate> {
    const rate = await this.repo.findOne({ where: { id, deletedAt: IsNull() } });
    if (!rate) throw new NotFoundException('Exchange rate not found');
    return rate;
  }

  async create(dto: CreateExchangeRateDto, orgId: string | null): Promise<ExchangeRate> {
    const rate = this.repo.create({
      orgId,
      rateDate: dto.rateDate,
      uzsPerUsd: dto.uzsPerUsd,
      source: dto.source ?? null,
    });
    return this.repo.save(rate);
  }

  async update(id: string, dto: UpdateExchangeRateDto): Promise<ExchangeRate> {
    const rate = await this.findById(id);
    if (dto.uzsPerUsd !== undefined) rate.uzsPerUsd = dto.uzsPerUsd;
    if (dto.source !== undefined) rate.source = dto.source;
    return this.repo.save(rate);
  }

  async remove(id: string): Promise<void> {
    const rate = await this.findById(id);
    await this.repo.softDelete(rate.id);
  }
}
