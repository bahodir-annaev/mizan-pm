import {
  Injectable,
  Inject,
  ConflictException,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Optional,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Repository } from 'typeorm';
import { TimeEntry } from '../../domain/entities/time-entry.entity';
import {
  ITimeEntryRepository,
  TIME_ENTRY_REPOSITORY,
  TimeEntryFilterParams,
  ProjectTimeReportRow,
} from '../../domain/repositories/time-entry-repository.interface';
import { TaskAssignee } from '../../../project-management/domain/entities/task-assignee.entity';
import { CreateTimeEntryDto } from '../dtos/create-time-entry.dto';
import { UpdateTimeEntryDto } from '../dtos/update-time-entry.dto';
import { TimeEntryFilterDto } from '../dtos/time-entry-filter.dto';
import {
  PaginatedResult,
  PaginationMeta,
} from '../../../../shared/application/pagination.dto';
import { FinanceCalculationService } from '../../../finance/application/services/finance-calculation.service';

interface CurrentUser {
  id: string;
  orgId?: string;
  roles: string[];
}

const MANAGER_ROLES = ['manager', 'admin', 'owner'];

@Injectable()
export class TimeTrackingService {
  constructor(
    @Inject(TIME_ENTRY_REPOSITORY)
    private readonly timeEntryRepository: ITimeEntryRepository,
    @InjectRepository(TaskAssignee)
    private readonly taskAssigneeRepo: Repository<TaskAssignee>,
    private readonly eventEmitter: EventEmitter2,
    @Optional()
    private readonly financeCalcService?: FinanceCalculationService,
  ) {}

  async startTimer(
    taskId: string,
    currentUser: CurrentUser,
    force = false,
  ): Promise<{ stopped?: TimeEntry; started: TimeEntry }> {
    await this.assertAssignedOrManager(taskId, currentUser);

    // Check for active timer
    const activeEntry = await this.timeEntryRepository.findActiveByUser(
      currentUser.id,
    );

    let stoppedEntry: TimeEntry | undefined;

    if (activeEntry) {
      if (!force) {
        if (activeEntry.taskId === taskId) {
          throw new ConflictException('Timer already running on this task');
        }
        throw new ConflictException({
          message: 'Active timer exists',
          activeEntry,
        });
      }

      // Force stop the active timer
      stoppedEntry = this.computeStop(activeEntry);
      stoppedEntry = await this.timeEntryRepository.save(stoppedEntry);
      this.eventEmitter.emit('time.stopped', { entry: stoppedEntry });
    }

    // Create new time entry
    const entry = new TimeEntry();
    entry.taskId = taskId;
    entry.userId = currentUser.id;
    entry.startTime = new Date();

    const started = await this.timeEntryRepository.save(entry);
    this.eventEmitter.emit('time.started', { entry: started, user: currentUser });

    return stoppedEntry ? { stopped: stoppedEntry, started } : { started };
  }

  async stopTimer(taskId: string, currentUser: CurrentUser): Promise<TimeEntry> {
    const activeEntry = await this.timeEntryRepository.findActiveByUserAndTask(
      currentUser.id,
      taskId,
    );

    if (!activeEntry) {
      throw new NotFoundException('No active timer on this task');
    }

    const stopped = this.computeStop(activeEntry);
    const saved = await this.timeEntryRepository.save(stopped);

    this.eventEmitter.emit('time.stopped', {
      entry: saved,
      duration: saved.durationSeconds,
    });

    // Stamp cost asynchronously — non-blocking, failures don't affect the entry
    this.stampEntryCost(saved, currentUser.orgId).catch(() => undefined);

    return saved;
  }

  async getTimeEntriesByTask(
    taskId: string,
    query: TimeEntryFilterDto,
  ): Promise<PaginatedResult<TimeEntry>> {
    const skip = (query.page - 1) * query.limit;
    const [entries, total] = await this.timeEntryRepository.findByTask(
      taskId,
      skip,
      query.limit,
    );
    return new PaginatedResult(
      entries,
      new PaginationMeta(query.page, query.limit, total),
    );
  }

  async getMyTimeEntries(
    currentUser: CurrentUser,
    query: TimeEntryFilterDto,
  ): Promise<PaginatedResult<TimeEntry>> {
    const skip = (query.page - 1) * query.limit;
    const filters: TimeEntryFilterParams = {
      taskId: query.taskId,
      startDate: query.startDate,
      endDate: query.endDate,
      isManual: query.isManual !== undefined ? query.isManual === 'true' : undefined,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
    };

    const [entries, total] = await this.timeEntryRepository.findByUser(
      currentUser.id,
      filters,
      skip,
      query.limit,
    );
    return new PaginatedResult(
      entries,
      new PaginationMeta(query.page, query.limit, total),
    );
  }

  async getActiveTimer(currentUser: CurrentUser): Promise<TimeEntry | null> {
    return this.timeEntryRepository.findActiveByUser(currentUser.id);
  }

  async getActiveTimerForTask(taskId: string): Promise<TimeEntry[]> {
    return this.timeEntryRepository.findActiveByTask(taskId);
  }

  async getAllActiveSessions(currentUser: CurrentUser): Promise<TimeEntry[]> {
    const isManager = currentUser.roles.some((r) => MANAGER_ROLES.includes(r));
    if (!isManager) {
      throw new ForbiddenException('Only managers and admins can view all active sessions');
    }
    return this.timeEntryRepository.findAllActive();
  }

  async createManualEntry(
    dto: CreateTimeEntryDto,
    currentUser: CurrentUser,
  ): Promise<TimeEntry> {
    // Validate user is assigned to task or has manager+ role
    await this.assertAssignedOrManager(dto.taskId, currentUser);

    const startTime = new Date(dto.startTime);
    const endTime = new Date(dto.endTime);

    if (endTime <= startTime) {
      throw new BadRequestException('endTime must be after startTime');
    }

    const entry = new TimeEntry();
    entry.taskId = dto.taskId;
    entry.userId = currentUser.id;
    entry.startTime = startTime;
    entry.endTime = endTime;
    entry.durationSeconds = Math.floor(
      (endTime.getTime() - startTime.getTime()) / 1000,
    );
    entry.isManual = true;
    entry.description = dto.description ?? null;

    const saved = await this.timeEntryRepository.save(entry);

    // Stamp cost asynchronously — non-blocking
    this.stampEntryCost(saved, currentUser.orgId).catch(() => undefined);

    return saved;
  }

  async updateEntry(
    id: string,
    dto: UpdateTimeEntryDto,
    currentUser: CurrentUser,
  ): Promise<TimeEntry> {
    const entry = await this.timeEntryRepository.findById(id);
    if (!entry) {
      throw new NotFoundException('Time entry not found');
    }

    if (entry.userId !== currentUser.id) {
      throw new ForbiddenException('You can only update your own time entries');
    }

    if (dto.description !== undefined) entry.description = dto.description;
    if (dto.startTime !== undefined) entry.startTime = new Date(dto.startTime);
    if (dto.endTime !== undefined) entry.endTime = new Date(dto.endTime);

    // Recompute duration if both times are set
    if (entry.startTime && entry.endTime) {
      if (entry.endTime <= entry.startTime) {
        throw new BadRequestException('endTime must be after startTime');
      }
      entry.durationSeconds = Math.floor(
        (entry.endTime.getTime() - entry.startTime.getTime()) / 1000,
      );
    }

    return this.timeEntryRepository.save(entry);
  }

  async deleteEntry(
    id: string,
    currentUser: CurrentUser,
  ): Promise<void> {
    const entry = await this.timeEntryRepository.findById(id);
    if (!entry) {
      throw new NotFoundException('Time entry not found');
    }

    const isManager = currentUser.roles.some((r) => MANAGER_ROLES.includes(r));
    if (entry.userId !== currentUser.id && !isManager) {
      throw new ForbiddenException(
        'You can only delete your own time entries unless you have manager role',
      );
    }

    await this.timeEntryRepository.remove(entry);
  }

  async getProjectTimeReport(
    projectId: string,
    currentUser: CurrentUser,
  ): Promise<{ tasks: ProjectTimeReportRow[]; totalSeconds: number }> {
    const isManager = currentUser.roles.some((r) => MANAGER_ROLES.includes(r));
    if (!isManager) {
      throw new ForbiddenException(
        'Only managers and admins can view project time reports',
      );
    }

    const tasks = await this.timeEntryRepository.getProjectTimeReport(projectId);
    const totalSeconds = tasks.reduce((sum, row) => sum + row.totalSeconds, 0);

    return { tasks, totalSeconds };
  }

  private async assertAssignedOrManager(
    taskId: string,
    currentUser: CurrentUser,
  ): Promise<void> {
    const isAssigned = await this.taskAssigneeRepo.findOne({
      where: { taskId, userId: currentUser.id },
    });
    const isManager = currentUser.roles.some((r) => MANAGER_ROLES.includes(r));

    if (!isAssigned && !isManager) {
      throw new ForbiddenException(
        'Must be assigned to task or have manager role',
      );
    }
  }

  private computeStop(entry: TimeEntry): TimeEntry {
    entry.endTime = new Date();
    entry.durationSeconds = Math.floor(
      (entry.endTime.getTime() - entry.startTime.getTime()) / 1000,
    );
    return entry;
  }

  /** Insert a time_entry_costs row for the given entry. Called fire-and-forget. */
  private async stampEntryCost(entry: TimeEntry, orgId?: string): Promise<void> {
    if (!this.financeCalcService) return;
    const hours = entry.hours ?? (entry.durationSeconds ? entry.durationSeconds / 3600 : null);
    if (!hours) return;

    const entryDate = entry.date ?? entry.startTime?.toISOString().split('T')[0];
    if (!entryDate) return;

    const rateRow = await this.financeCalcService.getEffectiveHourlyRate(entry.userId, entryDate);
    if (!rateRow) return;

    const exchangeRate = orgId
      ? await this.financeCalcService.getEffectiveExchangeRate(orgId, entryDate)
      : null;

    const costUzs = hours * rateRow.hourlyRateUzs;
    const costUsd = exchangeRate ? costUzs / exchangeRate : null;

    await this.financeCalcService['dataSource'].query(
      `INSERT INTO time_entry_costs
         (id, time_entry_id, user_id, project_id, org_id,
          hourly_rate_uzs_at_entry, cost_uzs, cost_usd,
          exchange_rate_at_entry, calculated_at, source)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, NOW(), 'REALTIME')
       ON CONFLICT (time_entry_id) DO NOTHING`,
      [entry.id, entry.userId, entry.projectId ?? null, orgId ?? null,
       rateRow.hourlyRateUzs, costUzs, costUsd, exchangeRate],
    );
  }
}
