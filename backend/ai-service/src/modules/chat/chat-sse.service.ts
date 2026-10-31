import { SseTransport } from "../../common/sse-transport";
import { Injectable } from "@nestjs/common";
import type { Response } from "express";
import type { Actor } from "../../common/types";
import { ChatAdmissionService } from "./chat-admission.service";
import { ChatWorkflowService } from "./chat-workflow.service";

@Injectable()
export class ChatSseService {
  constructor(
    private readonly sse: SseTransport,
    private readonly admission: ChatAdmissionService,
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
    const controller = new AbortController();
    const stream = this.sse.create(res);
    const disconnect = () => controller.abort();
    const detach = stream.onClose(disconnect);
    try {
      if (res.destroyed) return;
      const sources = await this.admission.prepare(
        actor,
        notebookId,
        sourceIds,
        requestId,
        controller.signal,
      );
      await this.workflow.streamAnswer({
        actor,
        notebookId,
        question,
        sourceIds,
        requestId,
        stream,
        sources,
        controller,
      });
    } finally {
      controller.abort();
      detach();
    }
  }
}
