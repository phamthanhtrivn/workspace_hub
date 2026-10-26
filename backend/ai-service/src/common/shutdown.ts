import { logError } from "./errors/error-log";

export async function settleAll(tasks: Promise<unknown>[]) {
  const results = await Promise.allSettled(tasks);
  const errors = results.filter((result) => result.status === "rejected");
  if (errors.length)
    throw new AggregateError(errors.map((result) => result.reason));
}

export function createShutdownHandler(
  service: string,
  drain: () => Promise<void>,
  timeoutMs: number,
) {
  let shutdown: Promise<void> | undefined;
  return () => {
    if (shutdown) return shutdown;
    const deadline = setTimeout(() => {
      logError("ai_shutdown_timeout", new Error(), {
        service,
        timeout_ms: timeoutMs,
      });
      // A hung job must not leave the container alive indefinitely. BullMQ retains its lock/state.
      process.exit(1);
    }, timeoutMs);
    shutdown = Promise.resolve()
      .then(drain)
      .catch((error) => {
        logError("ai_shutdown_failed", error, { service });
        process.exitCode = 1;
      })
      .finally(() => clearTimeout(deadline));
    return shutdown;
  };
}
