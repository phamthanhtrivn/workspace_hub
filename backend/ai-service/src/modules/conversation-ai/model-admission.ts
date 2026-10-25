import { setTimeout as pause } from "node:timers/promises";
import { config } from "../../config/env.config";
import { ModelMinuteQuotaException } from "../../common/errors/model-quota.exception";
import { admitModel } from "../../infrastructure/integrations/llm.client";

// Only retry admission: a provider call with an unknown outcome must never be replayed.
export async function admitConversationModel(
  tokens: number,
  model: string,
  signal: AbortSignal,
) {
  const started = performance.now();
  const deadline = started + config.CONVERSATION_AI_QUOTA_WAIT_MS;
  let retries = 0;
  try {
    while (true) {
      signal.throwIfAborted();
      try {
        await admitModel(tokens, model);
        return;
      } catch (error) {
        const remaining = deadline - performance.now();
        if (!(error instanceof ModelMinuteQuotaException) || remaining <= 0)
          throw error;
        retries++;
        await pause(Math.min(2000 + Math.random() * 500, remaining), undefined, { signal });
      }
    }
  } finally {
    if (retries)
      console.info(JSON.stringify({ event: "conversation_quota_wait", model, retries,
        duration_ms: Math.round(performance.now() - started), aborted: signal.aborted }));
  }
}
