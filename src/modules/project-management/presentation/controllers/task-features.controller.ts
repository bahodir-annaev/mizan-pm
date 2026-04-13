import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiNoContentResponse,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
  ApiProperty,
  ApiExtraModels,
  getSchemaPath,
} from '@nestjs/swagger';
import { TaskFeaturesService } from '../../application/services/task-features.service';
import { CreateChecklistItemDto } from '../../application/dtos/create-checklist-item.dto';
import { UpdateChecklistItemDto } from '../../application/dtos/update-checklist-item.dto';
import { CreateCommentDto } from '../../application/dtos/create-comment.dto';
import { UpdateCommentDto } from '../../application/dtos/update-comment.dto';
import { ChecklistItemResponseDto } from '../../application/dtos/checklist-item-response.dto';
import { CommentResponseDto } from '../../application/dtos/comment-response.dto';
import { PaginationQueryDto } from '../../../../shared/application/pagination.dto';
import { PaginationMetaResponseDto } from '../../../../shared/application/dtos/pagination-meta-response.dto';
import { JwtAuthGuard } from '../../../identity/infrastructure/guards/jwt-auth.guard';
import { RolesGuard } from '../../../identity/infrastructure/guards/roles.guard';
import { Roles } from '../../../identity/infrastructure/decorators/roles.decorator';
import { CurrentUser } from '../../../identity/infrastructure/decorators/current-user.decorator';
import { IsArray, IsString, IsUUID } from 'class-validator';

// ─── Inline body DTOs for simple payloads ───────────────────

class AddParticipantDto {
  @ApiProperty({ description: 'User ID to add as participant' })
  @IsUUID()
  userId: string;
}

class AddDependencyDto {
  @ApiProperty({ description: 'ID of the blocking task' })
  @IsUUID()
  blockerId: string;
}

class ReorderChecklistDto {
  @ApiProperty({ description: 'Ordered array of checklist item IDs', type: [String] })
  @IsArray()
  @IsString({ each: true })
  itemIds: string[];
}

// ─── Participant / Dependency inline response shapes ──────────

class TaskParticipantResponseDto {
  @ApiProperty({ example: 'participant-uuid', format: 'uuid' })
  id: string;
  @ApiProperty({ example: 'task-uuid', format: 'uuid' })
  taskId: string;
  @ApiProperty({ example: 'user-uuid', format: 'uuid' })
  userId: string;
  @ApiProperty({ example: '2026-04-01T00:00:00Z' })
  createdAt: Date;
}

class TaskDependencyResponseDto {
  @ApiProperty({ example: 'dep-uuid', format: 'uuid' })
  id: string;
  @ApiProperty({ example: 'blocked-task-uuid', format: 'uuid', description: 'Task that is blocked' })
  taskId: string;
  @ApiProperty({ example: 'blocker-task-uuid', format: 'uuid', description: 'Task that blocks' })
  blockerId: string;
  @ApiProperty({ example: '2026-04-01T00:00:00Z' })
  createdAt: Date;
}

// ─── Controller ─────────────────────────────────────────────

@ApiTags('Task Features')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('tasks')
@ApiUnauthorizedResponse({ description: 'Unauthorized' })
@ApiExtraModels(
  ChecklistItemResponseDto, CommentResponseDto,
  TaskParticipantResponseDto, TaskDependencyResponseDto,
  PaginationMetaResponseDto,
)
export class TaskFeaturesController {
  constructor(private readonly taskFeaturesService: TaskFeaturesService) {}

  // ─── Participants ───────────────────────────────────────

  @Get(':id/participants')
  @Roles('member')
  @ApiOperation({ summary: 'List participants of a task' })
  @ApiOkResponse({ type: [TaskParticipantResponseDto] })
  async getParticipants(@Param('id', ParseUUIDPipe) id: string) {
    return this.taskFeaturesService.getParticipants(id);
  }

  @Post(':id/participants')
  @Roles('member')
  @ApiOperation({ summary: 'Add a participant to a task' })
  @ApiCreatedResponse({ type: TaskParticipantResponseDto })
  async addParticipant(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddParticipantDto,
  ) {
    return this.taskFeaturesService.addParticipant(id, dto.userId);
  }

  @Delete(':id/participants/:userId')
  @Roles('member')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove a participant from a task' })
  @ApiNoContentResponse()
  async removeParticipant(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('userId', ParseUUIDPipe) userId: string,
  ) {
    await this.taskFeaturesService.removeParticipant(id, userId);
  }

  // ─── Dependencies ──────────────────────────────────────

  @Get(':id/dependencies')
  @Roles('member')
  @ApiOperation({ summary: 'List dependencies of a task' })
  @ApiOkResponse({ type: [TaskDependencyResponseDto] })
  async getDependencies(@Param('id', ParseUUIDPipe) id: string) {
    return this.taskFeaturesService.getDependencies(id);
  }

  @Post(':id/dependencies')
  @Roles('member')
  @ApiOperation({ summary: 'Add a dependency (blocker) to a task' })
  @ApiCreatedResponse({ type: TaskDependencyResponseDto })
  async addDependency(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddDependencyDto,
  ) {
    return this.taskFeaturesService.addDependency(id, dto.blockerId);
  }

  @Delete(':id/dependencies/:depId')
  @Roles('member')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove a dependency' })
  @ApiNoContentResponse()
  async removeDependency(
    @Param('depId', ParseUUIDPipe) depId: string,
  ) {
    await this.taskFeaturesService.removeDependency(depId);
  }

  // ─── Checklist ─────────────────────────────────────────

  @Get(':id/checklist')
  @Roles('member')
  @ApiOperation({ summary: 'List checklist items for a task' })
  @ApiOkResponse({ type: [ChecklistItemResponseDto] })
  async getChecklist(@Param('id', ParseUUIDPipe) id: string) {
    return this.taskFeaturesService.getChecklist(id);
  }

  @Post(':id/checklist')
  @Roles('member')
  @ApiOperation({ summary: 'Add a checklist item to a task' })
  @ApiCreatedResponse({ type: ChecklistItemResponseDto })
  async addChecklistItem(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateChecklistItemDto,
  ) {
    return this.taskFeaturesService.addChecklistItem(id, dto);
  }

  @Patch(':id/checklist/reorder')
  @Roles('member')
  @ApiOperation({ summary: 'Reorder checklist items' })
  @ApiOkResponse({ type: [ChecklistItemResponseDto] })
  async reorderChecklist(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReorderChecklistDto,
  ) {
    return this.taskFeaturesService.reorderChecklist(id, dto.itemIds);
  }

  @Patch(':id/checklist/:itemId')
  @Roles('member')
  @ApiOperation({ summary: 'Update a checklist item' })
  @ApiOkResponse({ type: ChecklistItemResponseDto })
  async updateChecklistItem(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @Body() dto: UpdateChecklistItemDto,
  ) {
    return this.taskFeaturesService.updateChecklistItem(itemId, dto);
  }

  @Delete(':id/checklist/:itemId')
  @Roles('member')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove a checklist item' })
  @ApiNoContentResponse()
  async removeChecklistItem(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('itemId', ParseUUIDPipe) itemId: string,
  ) {
    await this.taskFeaturesService.removeChecklistItem(itemId);
  }

  // ─── Comments ──────────────────────────────────────────

  @Get(':id/comments')
  @Roles('member')
  @ApiOperation({ summary: 'List comments on a task (paginated)' })
  @ApiOkResponse({
    schema: {
      properties: {
        items: { type: 'array', items: { $ref: getSchemaPath(CommentResponseDto) } },
        meta: { $ref: getSchemaPath(PaginationMetaResponseDto) },
      },
    },
  })
  async getComments(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() pagination: PaginationQueryDto,
  ) {
    return this.taskFeaturesService.getComments(id, pagination);
  }

  @Post(':id/comments')
  @Roles('member')
  @ApiOperation({ summary: 'Add a comment to a task' })
  @ApiCreatedResponse({ type: CommentResponseDto })
  async addComment(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateCommentDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.taskFeaturesService.addComment(id, user.id, dto);
  }

  @Patch(':id/comments/:commentId')
  @Roles('member')
  @ApiOperation({ summary: 'Update a comment (author only)' })
  @ApiOkResponse({ type: CommentResponseDto })
  @ApiForbiddenResponse({ description: 'Only the comment author can edit it' })
  async updateComment(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('commentId', ParseUUIDPipe) commentId: string,
    @Body() dto: UpdateCommentDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.taskFeaturesService.updateComment(commentId, user.id, dto);
  }

  @Delete(':id/comments/:commentId')
  @Roles('member')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a comment (author only)' })
  @ApiNoContentResponse()
  @ApiForbiddenResponse({ description: 'Only the comment author can delete it' })
  async removeComment(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('commentId', ParseUUIDPipe) commentId: string,
    @CurrentUser() user: { id: string },
  ) {
    await this.taskFeaturesService.removeComment(commentId, user.id);
  }
}
