import {
  Controller,
  Post,
  Param,
  Headers,
  Body,
  ParseUUIDPipe,
  UnauthorizedException,
  BadRequestException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { timingSafeEqual } from 'node:crypto';
import { ConversationAiService } from './conversation-ai.service';
@Controller('internal/conversation-ai')
export class ConversationAiController {
  constructor(private readonly ai: ConversationAiService) {}
  @Post(':id/:action')
  async handle(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('action') action: string,
    @Headers('x-internal-service-key') key: string,
    @Body() body: unknown,
  ) {
    const expected = process.env.AI_COMMUNICATION_SERVICE_KEY || '';
    if (!this.ai.enabled() || expected.length < 32)
      throw new ServiceUnavailableException();
    if (
      typeof key !== 'string' ||
      Buffer.byteLength(key) !== Buffer.byteLength(expected) ||
      !timingSafeEqual(Buffer.from(key), Buffer.from(expected))
    )
      throw new UnauthorizedException();
    const data = (body || {}) as Record<string, unknown>;
    if (action === 'claim') return this.ai.claim(id);
    if (
      typeof data.token !== 'string' ||
      !/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(
        data.token,
      )
    )
      throw new BadRequestException();
    if (action === 'validate') return this.ai.validate(id, data.token);
    if (action === 'attachment') return this.ai.attachment(id, data.token);
    if (action === 'history') return this.ai.history(id, data.token);
    if (action === 'tasks') {
      if (
        data.scope !== 'today' &&
        data.scope !== 'overdue' &&
        data.scope !== 'open'
      )
        throw new BadRequestException();
      return this.ai.tasks(id, data.token, data.scope);
    }
    if (
      action === 'complete' &&
      typeof data.content === 'string' &&
      typeof data.failed === 'boolean'
    )
      return this.ai.complete(id, data.token, data.content, data.failed);
    throw new BadRequestException();
  }
}
