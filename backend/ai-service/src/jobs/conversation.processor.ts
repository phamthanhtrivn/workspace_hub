import { BadRequestException } from "@nestjs/common";
import { summarizeAttachment } from "../modules/conversation-ai/attachment-summary";
import { config } from "../config/env.config";
import { conversationAnswer } from "../modules/conversation-ai/conversation-agent";
import { setTimeout as pause } from "node:timers/promises";
import { pollUntilAborted } from "../common/abort-polling";

type SavedAnswer = { token: string; content: string; failed: boolean };
type ConversationCheckpoint = {
  answer?: SavedAnswer;
  claimToken?: string;
  saveClaim?: (token: string) => Promise<void>;
  save: (answer: SavedAnswer) => Promise<void>;
};
class CommunicationError extends Error {
  constructor(readonly status: number) {
    super(`Communication AI failed (${status})`);
  }
}
async function communication<T>(
  id: string,
  action: string,
  body: object = {},
  signal?: AbortSignal,
): Promise<T> {
  const res = await fetch(
    `${config.COMMUNICATION_SERVICE_URL}/internal/conversation-ai/${id}/${action}`,
    {
      method: "POST",
      redirect: "error",
      signal: signal
        ? AbortSignal.any([signal, AbortSignal.timeout(15000)])
        : AbortSignal.timeout(15000),
      headers: {
        "content-type": "application/json",
        "x-internal-service-key": config.AI_COMMUNICATION_SERVICE_KEY,
      },
      body: JSON.stringify(body),
    },
  );
  if (!res.ok) {
    await res.body?.cancel();
    throw new CommunicationError(res.status);
  }
  return ((await res.json()) as { data: T }).data;
}
export async function processConversation(
  id: string,
  checkpoint?: ConversationCheckpoint,
) {
  if (config.CONVERSATION_AI_ENABLED !== "true") return;
  let answer = checkpoint?.answer;
  if (!answer && checkpoint?.claimToken) {
    answer = {
      token: checkpoint.claimToken,
      content:
        "Yêu cầu AI bị gián đoạn trước khi gửi xong câu trả lời. Bạn hãy gửi lại một tin @ai mới để thử lại nhé.",
      failed: true,
    };
    await checkpoint.save(answer);
  }
  if (!answer) {
    const claim = await communication<{
      question: string;
      token: string;
      attachmentSummary?: boolean;
    } | null>(id, "claim");
    if (!claim) return;
    await checkpoint?.saveClaim?.(claim.token);
    const controller = new AbortController();
    const signal = AbortSignal.any([
      controller.signal,
      AbortSignal.timeout(180000),
    ]);
    const authorize = () =>
      communication(id, "validate", { token: claim.token }, signal);
    let authorizeSource: (() => Promise<void>) | undefined;
    const stopPolling = pollUntilAborted(controller, 5000, async () => {
      await authorize();
      await authorizeSource?.();
    });
    try {
      const content = claim.attachmentSummary
        ? await summarizeAttachment(
            id,
            () =>
              communication(id, "attachment", { token: claim.token }, signal),
            authorize,
            signal,
            (check) => {
              authorizeSource = check;
            },
          )
        : await conversationAnswer(
            claim.question,
            () => communication(id, "history", { token: claim.token }, signal),
            signal,
            authorize,
          );
      signal.throwIfAborted();
      answer = { token: claim.token, content, failed: false };
    } catch (error) {
      // Never log prompts, attachment contents, tokens or provider error messages.
      console.error(
        JSON.stringify({
          event: "conversation_generation_failed",
          request_id: id,
          attachment: !!claim.attachmentSummary,
          error_type:
            error instanceof Error ? error.constructor.name : "UnknownError",
          aborted: signal.aborted,
        }),
      );
      answer = {
        token: claim.token,
        content:
          claim.attachmentSummary && error instanceof BadRequestException
            ? `Không thể tóm tắt tài liệu: ${error.message.slice(0, 500)}`
            : "Mình chưa trả lời được yêu cầu này. Vui lòng thử lại bằng một tin @ai mới sau ít phút.",
        failed: true,
      };
    } finally {
      stopPolling();
      controller.abort();
    }
    // Save before delivery. A BullMQ retry can resend this result without another model call.
    if (checkpoint) await checkpoint.save(answer);
  }
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      await communication(id, "complete", answer);
      return;
    } catch (error) {
      if (
        error instanceof CommunicationError &&
        [403, 404, 409].includes(error.status)
      )
        return;
      if (attempt === 2) throw error;
      await pause(250 * 2 ** attempt);
    }
  }
}
