import { SseTransport } from "../../common/sse-transport";
import { HttpException, Injectable } from "@nestjs/common";
import type { Response } from "express";
import { z } from "zod";
import { messageSchema } from "./work-assistant.schemas";
import type { Actor } from "../../common/types";
import { WorkAssistantAccessService } from "./work-assistant-access.service";
import { WorkAssistantWorkflowService } from "./work-assistant-workflow.service";

@Injectable()
export class WorkAssistantSseService {
  constructor(
    private readonly sse: SseTransport,
    private readonly access: WorkAssistantAccessService,
    private readonly workflow: WorkAssistantWorkflowService,
  ) {}
  async message(
    actor: Actor,
    sessionId: string,
    input: z.infer<typeof messageSchema>,
    res: Response,
  ) {
    this.access.enabled();
    const session = await this.access.owned(actor, sessionId);
    if (!session.project_id && input.audience === "project")
      throw new HttpException("Project scope required", 400);
    await this.workflow.answer(actor, this.sse.create(res), session, input);
  }
}
