import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiExtraModels,
} from '@nestjs/swagger';
import { extname } from 'path';
import { randomUUID } from 'crypto';
import { FileService } from '../../application/services/file.service';
import { FileResponseDto } from '../../application/dtos/file-response.dto';
import { JwtAuthGuard } from '../../../identity/infrastructure/guards/jwt-auth.guard';
import { RolesGuard } from '../../../identity/infrastructure/guards/roles.guard';
import { CurrentUser } from '../../../identity/infrastructure/decorators/current-user.decorator';

const uploadStorage = diskStorage({
  destination: './uploads',
  filename: (_req, file, cb) => {
    const uniqueName = `${randomUUID()}${extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

@ApiTags('Files')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
@ApiUnauthorizedResponse({ description: 'Unauthorized' })
@ApiExtraModels(FileResponseDto)
export class FileController {
  constructor(private readonly fileService: FileService) {}

  @Get('files/:id')
  @ApiOperation({ summary: 'Get file metadata by ID' })
  @ApiOkResponse({ type: FileResponseDto })
  @ApiNotFoundResponse({ description: 'File not found' })
  async getFile(@Param('id', ParseUUIDPipe) id: string) {
    return this.fileService.findById(id);
  }

  @Delete('files/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a file (uploader or admin only)' })
  @ApiNoContentResponse({ description: 'File deleted from storage and database' })
  @ApiForbiddenResponse({ description: 'Only uploader or admin can delete' })
  async deleteFile(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: { id: string; roles: string[] },
  ) {
    await this.fileService.deleteFile(id, user.id, user.roles);
  }

  @Get('projects/:id/files')
  @ApiOperation({ summary: 'List files attached to a project' })
  @ApiOkResponse({ type: [FileResponseDto] })
  async listProjectFiles(@Param('id', ParseUUIDPipe) id: string) {
    return this.fileService.findByEntity('project', id);
  }

  @Post('projects/:id/files')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload a file to a project' })
  @ApiBody({ schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } }, required: ['file'] } })
  @ApiCreatedResponse({ type: FileResponseDto })
  @UseInterceptors(FileInterceptor('file', { storage: uploadStorage }))
  async uploadProjectFile(
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: { id: string; roles: string[] },
  ) {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    return this.fileService.uploadFile('project', id, {
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      storagePath: file.path,
    }, user.id);
  }

  @Get('clients/:id/files')
  @ApiOperation({ summary: 'List files attached to a client' })
  @ApiOkResponse({ type: [FileResponseDto] })
  async listClientFiles(@Param('id', ParseUUIDPipe) id: string) {
    return this.fileService.findByEntity('client', id);
  }

  @Post('clients/:id/files')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload a file to a client' })
  @ApiBody({ schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } }, required: ['file'] } })
  @ApiCreatedResponse({ type: FileResponseDto })
  @UseInterceptors(FileInterceptor('file', { storage: uploadStorage }))
  async uploadClientFile(
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: { id: string; roles: string[] },
  ) {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    return this.fileService.uploadFile('client', id, {
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      storagePath: file.path,
    }, user.id);
  }
}
