import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
  ApiOkResponse,
  ApiUnauthorizedResponse,
  ApiBadRequestResponse,
} from '@nestjs/swagger';
import { SearchService } from '../../application/services/search.service';
import { JwtAuthGuard } from '../../../identity/infrastructure/guards/jwt-auth.guard';
import { CurrentUser } from '../../../identity/infrastructure/decorators/current-user.decorator';

@ApiTags('Search')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('search')
@ApiUnauthorizedResponse({ description: 'Unauthorized' })
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  @ApiOperation({ summary: 'Global search across projects, tasks, clients, and users' })
  @ApiQuery({ name: 'q', required: true, description: 'Search query (min 2 chars)' })
  @ApiQuery({ name: 'type', required: false, description: 'Comma-separated entity types: project,task,client,user' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  @ApiOkResponse({ description: 'Returns matched results grouped by entity type, each with id, name/title, and type field' })
  @ApiBadRequestResponse({ description: 'Query too short (min 2 characters)' })
  async search(
    @Query('q') q: string,
    @Query('type') type: string,
    @Query('limit') limit: string,
    @Query('offset') offset: string,
    @CurrentUser() user: any,
  ) {
    return this.searchService.search(q, {
      type,
      orgId: user.orgId,
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    });
  }
}
