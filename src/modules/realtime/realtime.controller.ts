import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiOkResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../identity/infrastructure/guards/jwt-auth.guard';
import { RealtimeGateway } from './realtime.gateway';

@ApiTags('Realtime')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('realtime/users/online')
export class RealtimeController {
  constructor(private readonly realtimeGateway: RealtimeGateway) {}

  @Get()
  @ApiOperation({ summary: 'Get IDs of users currently connected via WebSocket' })
  @ApiOkResponse({ schema: { type: 'array', items: { type: 'string' } } })
  getOnlineUsers(): string[] {
    return this.realtimeGateway.getOnlineUserIds();
  }
}
