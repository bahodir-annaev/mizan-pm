import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from '../../domain/entities/notification.entity';
import {
  PaginatedResult,
  PaginationMeta,
  PaginationQueryDto,
} from '../../../../shared/application/pagination.dto';

@Injectable()
export class NotificationService {
  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
  ) {}

  async create(
    userId: string,
    type: string,
    title: string,
    message: string,
    entityType?: string,
    entityId?: string,
  ): Promise<Notification> {
    const notification = this.notificationRepository.create({
      userId,
      type,
      title,
      message,
      entityType: entityType ?? null,
      entityId: entityId ?? null,
    });

    return this.notificationRepository.save(notification);
  }

  async findByUser(
    userId: string,
    pagination: PaginationQueryDto,
  ): Promise<PaginatedResult<Notification>> {
    const skip = (pagination.page - 1) * pagination.limit;

    const [items, total] = await this.notificationRepository.findAndCount({
      where: { userId },
      order: { createdAt: 'DESC' },
      skip,
      take: pagination.limit,
    });

    return new PaginatedResult(
      items,
      new PaginationMeta(pagination.page, pagination.limit, total),
    );
  }

  async markAsRead(id: string, userId: string): Promise<Notification> {
    const notification = await this.notificationRepository.findOne({
      where: { id },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    if (notification.userId !== userId) {
      throw new ForbiddenException('You can only mark your own notifications as read');
    }

    notification.isRead = true;
    return this.notificationRepository.save(notification);
  }

  async markAllAsRead(userId: string): Promise<void> {
    await this.notificationRepository.update(
      { userId, isRead: false },
      { isRead: true },
    );
  }

  async getUnreadCount(userId: string): Promise<number> {
    return this.notificationRepository.count({
      where: { userId, isRead: false },
    });
  }
}
