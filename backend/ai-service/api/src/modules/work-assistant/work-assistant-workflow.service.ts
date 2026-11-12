import {
  ApplicationEventStream,
  SseTransport,
} from "../../common/sse-transport";
import { HttpException, Injectable } from "@nestjs/common";
import type { Response } from "express";
import { SSE_HEARTBEAT_MS } from "../../common/sse";
import { createAbortGuard, isCancellation } from "../../common/abort-guard";
import { z } from "zod";
import { messageSchema } from "./work-assistant.schemas";
import type { Actor } from "../../common/types";
import { Profile } from "../../common/profiling/pipeline-profiler";
import { WorkStore, type WorkSession } from "./work-store";
import { WorkAssistantGenerationService } from "./work-assistant-generation.service";
import { WorkAssistantAccessService } from "./work-assistant-access.service";

@Injectable()
export class WorkAssistantWorkflowService {
  constructor(
    private readonly sse: SseTransport,
    private readonly store: WorkStore,
    private readonly generation: WorkAssistantGenerationService,
    private readonly access: WorkAssistantAccessService,
  ) {}

  async message(
    actor: Actor,
    sessionId: string,
    input: z.infer<typeof messageSchema>,
    res: Response,
  ) {
    const session = await this.access.owned(actor, sessionId, input);
    await this.answer(actor, this.sse.create(res), session, input);
  }

  private async answer(
    actor: Actor,
    stream: ApplicationEventStream,
    session: WorkSession,
    input: z.infer<typeof messageSchema>,
  ) {
    const { requestId } = input;
    if (stream.destroyed) return;
    const guard = createAbortGuard(105000);
    const { controller, signal } = guard;
    const detach = stream.onClose(() => controller.abort());
    try {
      await this.store.begin(actor, session, requestId, signal);
    } catch (error) {
      const aborted = signal.aborted;
      detach();
      guard.stop();
      if (aborted) return;
      throw error;
    }
    if (stream.destroyed) controller.abort();
    if (signal.aborted) {
      detach();
      const canceled = isCancellation(signal);
      guard.stop();
      await this.store.fail(actor, requestId, canceled);

      return;
    }
    guard.poll(1000, async () => {
      if (await this.store.canceled(actor, requestId)) controller.abort();
    });
    stream.start();
    stream.emit("request", { requestId });
    const heartbeat = setInterval(() => {
      stream.heartbeat();
    }, SSE_HEARTBEAT_MS);
    const timing = new Profile("work_assistant");
    let deltaCount = 0;
    let completed = false;
    try {
      stream.emit("status", { message: "Đang lấy dữ liệu mới…" });
      const result = await this.generation.generateAnswer(
        { actor, session, input, signal, timing },
        (message) => stream.emit("status", { message }),
        (text) => {
          if (deltaCount === 0) timing.mark("first_delta_ms");
          timing.set("delta_count", ++deltaCount);
          stream.emit("delta", { text });
        },
      );
      completed = true;
      stream.emit("done", result);
    } catch (error) {
      const failure = signal.aborted ? signal.reason : error;
      const canceled = isCancellation(signal);
      const timedOut =
        failure instanceof Error && failure.name === "TimeoutError";
      await this.store.fail(actor, requestId, canceled).catch(() => undefined);
      const status =
        failure instanceof HttpException ? failure.getStatus() : 503;
      stream.emit("error", {
        requestId,
        status,
        message: this.failureMessage(status, timedOut, canceled),
      });
      console.warn(
        JSON.stringify({
          event: "work_assistant_failed",
          requestId,
          status,
          canceled,
        }),
      );
    } finally {
      timing.finish(completed ? "ok" : "failed");
      guard.stop();
      clearInterval(heartbeat);
      detach();
      stream.end();
    }
  }

  failureMessage(status: number, timedOut: boolean, canceled: boolean) {
    if (timedOut) return "Hết thời gian chờ AI. Vui lòng thử lại sau.";
    if (canceled) return "Yêu cầu đã dừng.";
    if (status === 403)
      return "Quyền truy cập đã thay đổi. Vui lòng mở lại trợ lý.";
    if (status === 429) return "AI đang chờ hạn mức. Hãy thử lại sau.";

    return "Chưa thể trả lời lúc này. Vui lòng thử lại; trợ lý chưa thay đổi dữ liệu công việc.";
  }

  async cancel(actor: Actor, requestId: string) {
    await this.store.cancel(actor, requestId);

    return { data: { canceled: true } };
  }
}
