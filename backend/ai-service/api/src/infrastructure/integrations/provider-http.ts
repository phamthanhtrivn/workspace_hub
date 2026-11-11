import { Agent } from "undici";
import { config } from "../../config/env.config";
import { logError } from "../../common/errors/error-log";

const connections = new Agent({
  connect: { timeout: Math.min(config.LLM_TIMEOUT_MS, 10000) },
  connections: 2,
  pipelining: 1,
  keepAliveTimeout: 30000,
  keepAliveMaxTimeout: 60000,
});

export function isProviderConnectTimeout(error: unknown): boolean {
  const detail = error as {
    code?: unknown;
    syscall?: unknown;
    cause?: unknown;
  } | null;

  return (
    detail?.code === "UND_ERR_CONNECT_TIMEOUT" ||
    (detail?.code === "ETIMEDOUT" && detail?.syscall === "connect") ||
    (detail?.cause != null && isProviderConnectTimeout(detail.cause))
  );
}

export const providerFetch: typeof fetch = async (input, init) => {
  const originalSignal =
    init?.signal ?? (input instanceof Request ? input.signal : undefined);
  const deadline = AbortSignal.timeout(config.LLM_TIMEOUT_MS);
  const signal = originalSignal
    ? AbortSignal.any([originalSignal, deadline])
    : deadline;
  const options = {
    ...init,
    signal,
    redirect: "error" as const,
    dispatcher: connections,
  };
  // Only a failed connection proves no provider request was sent. Never replay
  // a received HTTP response, an interrupted stream or an unknown socket failure.
  const reusable =
    !(input instanceof Request) &&
    (init?.body == null || typeof init.body === "string");
  for (let attempt = 1; ; attempt++) {
    signal.throwIfAborted();
    const started = performance.now();
    try {
      return await fetch(input, options);
    } catch (error) {
      logError("ai_provider_connection_failed", error, {
        attempt,
        duration_ms: Math.round(performance.now() - started),
        connect_timeout: isProviderConnectTimeout(error),
      });
      if (
        attempt >= 3 ||
        !isProviderConnectTimeout(error) ||
        signal.aborted ||
        !reusable
      )
        throw error;
      console.info(
        JSON.stringify({
          event: "ai_provider_connect_retry",
          attempt: attempt + 1,
        }),
      );
    }
  }
};

export function closeProviderConnections() {
  return connections.close();
}
