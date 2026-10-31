import { Injectable } from "@nestjs/common";
import type { Response } from "express";
import { z } from "zod";
import {
  overviewSchema,
  sessionSchema,
  sessionsSchema,
  messageSchema,
} from "./work-assistant.schemas";
import type { Actor } from "../../common/types";
import { WorkAssistantQueryService } from "./work-assistant-query.service";
import { WorkAssistantWorkflowService } from "./work-assistant-workflow.service";
import { WorkAssistantSseService } from "./work-assistant-sse.service";

@Injectable()
export class WorkAssistantService {
  constructor(
    private readonly queries: WorkAssistantQueryService,
    private readonly workflow: WorkAssistantWorkflowService,
    private readonly transport: WorkAssistantSseService,
  ) {}
  async overview(actor: Actor, input: z.infer<typeof overviewSchema>) {
    return this.queries.overview(actor, input);
  }

  async session(actor: Actor, data: z.infer<typeof sessionSchema>) {
    return this.queries.session(actor, data);
  }

  async sessions(actor: Actor, data: z.infer<typeof sessionsSchema>) {
    return this.queries.sessions(actor, data);
  }

  async createSession(actor: Actor, projectId?: string) {
    return this.queries.createSession(actor, projectId);
  }

  async cancel(actor: Actor, requestId: string) {
    return this.workflow.cancel(actor, requestId);
  }

  async message(
    actor: Actor,
    sessionId: string,
    input: z.infer<typeof messageSchema>,
    res: Response,
  ) {
    return this.transport.message(actor, sessionId, input, res);
  }
}
