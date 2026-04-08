import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { File } from '../../domain/entities/file.entity';
import * as fs from 'fs';
import * as path from 'path';

const ADMIN_ROLES = ['admin', 'owner'];

interface FileData {
  originalName: string;
  mimeType: string;
  size: number;
  storagePath: string;
}

@Injectable()
export class FileService {
  constructor(
    @InjectRepository(File)
    private readonly fileRepository: Repository<File>,
  ) {}

  async uploadFile(
    entityType: string,
    entityId: string,
    fileData: FileData,
    userId: string,
  ): Promise<File> {
    const file = this.fileRepository.create({
      entityType,
      entityId,
      originalName: fileData.originalName,
      mimeType: fileData.mimeType,
      size: fileData.size,
      storagePath: fileData.storagePath,
      uploadedBy: userId,
    });

    return this.fileRepository.save(file);
  }

  async findByEntity(entityType: string, entityId: string): Promise<File[]> {
    return this.fileRepository.find({
      where: { entityType, entityId },
      relations: ['uploader'],
      order: { createdAt: 'DESC' },
    });
  }

  async findById(id: string): Promise<File> {
    const file = await this.fileRepository.findOne({
      where: { id },
      relations: ['uploader'],
    });

    if (!file) {
      throw new NotFoundException('File not found');
    }

    return file;
  }

  async deleteFile(id: string, userId: string, userRoles: string[]): Promise<void> {
    const file = await this.findById(id);

    const isAdmin = userRoles.some((r) => ADMIN_ROLES.includes(r));
    if (file.uploadedBy !== userId && !isAdmin) {
      throw new ForbiddenException(
        'Only the uploader or an admin can delete this file',
      );
    }

    // Remove physical file if it exists
    const fullPath = path.resolve(file.storagePath);
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }

    await this.fileRepository.remove(file);
  }
}
