import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { HourlyRate } from '../../domain/entities/hourly-rate.entity';
import { CreateHourlyRateDto } from '../dtos/create-hourly-rate.dto';
import { FinanceCalculationService } from './finance-calculation.service';

@Injectable()
export class HourlyRateService {
  constructor(
    @InjectRepository(HourlyRate)
    private readonly repo: Repository<HourlyRate>,
    private readonly calcService: FinanceCalculationService,
  ) {}

  /** Get current effective rate per user for an org (latest row per user). */
  async listCurrent(orgId: string): Promise<HourlyRate[]> {
    return this.repo.query(
      `SELECT DISTINCT ON (user_id) hr.*
       FROM hourly_rates hr
       WHERE hr.org_id = $1 AND hr.deleted_at IS NULL
       ORDER BY user_id, effective_date DESC`,
      [orgId],
    );
  }

  async historyForUser(userId: string): Promise<HourlyRate[]> {
    return this.repo.find({
      where: { userId, deletedAt: IsNull() },
      order: { effectiveDate: 'DESC' },
    });
  }

  async currentForUser(userId: string): Promise<HourlyRate | null> {
    return this.repo.findOne({
      where: { userId, deletedAt: IsNull() },
      order: { effectiveDate: 'DESC' },
    });
  }

  async findById(id: string): Promise<HourlyRate> {
    const rate = await this.repo.findOne({ where: { id, deletedAt: IsNull() } });
    if (!rate) throw new NotFoundException('Hourly rate not found');
    return rate;
  }

  async create(dto: CreateHourlyRateDto, orgId: string): Promise<HourlyRate> {
    const salary = dto.salaryUzs;
    const taxComponents = this.calcService.computeTaxComponents(salary);

    const taxUzs = dto.taxUzs ?? taxComponents.taxUzs;
    const jssmUzs = dto.jssmUzs ?? taxComponents.jssmUzs;
    const bonusUzs = dto.bonusUzs ?? 0;
    const adminShareUzs = dto.adminShareUzs ?? 0;
    const equipmentShareUzs = dto.equipmentShareUzs ?? 0;
    const overheadShareUzs = dto.overheadShareUzs ?? 0;
    const workingHours = dto.workingHoursPerMonth ?? 176;

    const exchangeRate = await this.calcService.getEffectiveExchangeRate(orgId, dto.effectiveDate);

    const computed = this.calcService.computeHourlyRate(
      { salaryUzs: salary, bonusUzs, taxUzs, jssmUzs, adminShareUzs, equipmentShareUzs, overheadShareUzs, workingHoursPerMonth: workingHours },
      exchangeRate,
    );

    const rate = this.repo.create({
      userId: dto.userId,
      orgId,
      effectiveDate: dto.effectiveDate,
      salaryUzs: salary,
      bonusUzs,
      taxUzs,
      jssmUzs,
      adminShareUzs,
      equipmentShareUzs,
      overheadShareUzs,
      totalMonthlyCostUzs: computed.totalMonthlyCostUzs,
      hourlyRateUzs: computed.hourlyRateUzs,
      hourlyRateUsd: computed.hourlyRateUsd,
      exchangeRateUsed: exchangeRate,
      workingHoursPerMonth: workingHours,
      notes: dto.notes ?? null,
    });

    return this.repo.save(rate);
  }

  async remove(id: string): Promise<void> {
    await this.findById(id);
    await this.repo.softDelete(id);
  }
}
