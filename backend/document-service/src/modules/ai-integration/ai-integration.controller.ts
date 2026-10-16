import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { AI_DOCUMENT_ROUTES } from './ai-integration.constants';
import { AiIntegrationService } from './ai-integration.service';
import { ResolveAiDocumentsDto } from './dto/resolve-ai-documents.dto';
import { AiDelegationGuard } from './guards/ai-delegation.guard';
import type { AiRequest } from './guards/ai-delegation.guard';

@Controller(AI_DOCUMENT_ROUTES.ROOT)
@UseGuards(AiDelegationGuard)
export class AiIntegrationController {
  constructor(private readonly integration: AiIntegrationService) {}

  @Post(AI_DOCUMENT_ROUTES.RESOLVE)
  async resolve(
    @Req() request: AiRequest,
    @Body() body: ResolveAiDocumentsDto,
  ) {
    return {
      message: 'AI sources resolved',
      data: await this.integration.resolveBatch(request.aiActor, body, true),
    };
  }

  @Post(AI_DOCUMENT_ROUTES.ACCESS_CHECK)
  async access(@Req() request: AiRequest, @Body() body: ResolveAiDocumentsDto) {
    // Renew a short-lived descriptor only after rechecking the same source revision.
    return {
      message: 'AI source access verified',
      data: await this.integration.resolveBatch(request.aiActor, body, true),
    };
  }
}
