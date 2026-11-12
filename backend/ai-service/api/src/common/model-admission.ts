import { setTimeout as pause } from "node:timers/promises";
import { config } from "../config/env.config";
import { ModelMinuteQuotaException } from "./errors/model-quota.exception";

/** Waits only for local admission. Never wrap a provider request in this retry loop. */
export async function waitForModelAdmission(
  admit: () => Promise<void>,
  signal: AbortSignal,
  waitMs = config.LLM_QUOTA_WAIT_MS,
) {
  const deadline = performance.now() + waitMs;
  while (true) {
    signal.throwIfAborted();
    try {
      await admit();
      signal.throwIfAborted();

      return;
    } catch (error) {
      const remaining = deadline - performance.now();
      if (!(error instanceof ModelMinuteQuotaException) || remaining <= 0)
        throw error;
      await pause(
        Math.min(error.retryAfterMs + Math.random() * 250, remaining),
        undefined,
        { signal },
      );
      signal.throwIfAborted();
      if (performance.now() >= deadline) throw error;
    }
  }
}
