import { Injectable } from "@nestjs/common";
import type { Response } from "express";
import type { Actor } from "../../common/types";
import { ChatSseService } from "./chat-sse.service";
import { ChatWorkflowService } from "./chat-workflow.service";

@Injectable()
export class ChatService {
  constructor(
    private readonly transport: ChatSseService,
    private readonly workflow: ChatWorkflowService,
  ) {}
  async answer(
    actor: Actor,
    notebookId: string,
    question: string,
    sourceIds: string[],
    requestId: string,
    res: Response,
  ) {
    return this.transport.answer(
      actor,
      notebookId,
      question,
      sourceIds,
      requestId,
      res,
    );
  }

  async cancel(actor: Actor, requestId: string) {
    return this.workflow.cancel(actor, requestId);
  }
}
