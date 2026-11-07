import { ApplicationEventStream } from "../../common/sse-transport";
import { HttpException, Injectable } from "@nestjs/common";
import { pollUntilAborted } from "../../common/abort-polling";
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
    private readonly store: WorkStore,
    private readonly generation: WorkAssistantGenerationService,
    private readonly access: WorkAssistantAccessService,
  ) {}
  async answer(
    actor: Actor,
    stream: ApplicationEventStream,
    session: WorkSession,
    input: z.infer<typeof messageSchema>,
  ) {
    const { requestId } = input;
    if (stream.destroyed) return;
    await this.store.begin(actor, session, requestId);
    if (stream.destroyed) {
      await this.store.fail(actor, requestId, true);
      return;
    }
    const controller = new AbortController();
    let timedOut = false;
    const timeout = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, 105000);
    const stopPolling = pollUntilAborted(controller, 1000, async () => {
      if (await this.store.canceled(actor, requestId)) controller.abort();
    });
    const close = () => controller.abort();
    const detach = stream.onClose(close);
    stream.start();
    stream.emit("request", { requestId });
    const heartbeat = setInterval(() => {
      stream.heartbeat();
    }, 15000);
    const timing = new Profile("work_assistant");
    let completed = false;
    try {
      stream.emit("status", { message: "Đang lấy dữ liệu mới…" });
      const result = await this.generation.generateAnswer(
        { actor, session, input, signal: controller.signal, timing },
        (message) => stream.emit("status", { message }),
      );
      completed = true;
      stream.emit("done", result);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError")
        controller.abort();
      await this.store
        .fail(actor, requestId, controller.signal.aborted && !timedOut)
        .catch(() => undefined);
      const status = error instanceof HttpException ? error.getStatus() : 503;
      stream.emit("error", {
        requestId,
        status,
        message: this.failureMessage(
          status,
          timedOut,
          controller.signal.aborted,
        ),
      });
      console.warn(
        JSON.stringify({
          event: "work_assistant_failed",
          requestId,
          status,
          canceled: controller.signal.aborted,
        }),
      );
    } finally {
      timing.finish(completed ? "ok" : "failed");
      controller.abort();
      clearTimeout(timeout);
      stopPolling();
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
    this.access.enabled();
    await this.store.cancel(actor, requestId);
    return { data: { canceled: true } };
  }
}
