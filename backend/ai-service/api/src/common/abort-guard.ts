import { pollUntilAborted } from "./abort-polling";

export function isCancellation(signal: AbortSignal) {
  return (
    signal.aborted &&
    signal.reason instanceof Error &&
    signal.reason.name === "AbortError"
  );
}

/**
 * Cancellation scope for a long-running job: `signal` aborts on timeout or when
 * a periodic access check fails; `stop()` ends polling and aborts remaining work.
 */
export function createAbortGuard(timeoutMs?: number) {
  const controller = new AbortController();
  const signal =
    timeoutMs === undefined
      ? controller.signal
      : AbortSignal.any([controller.signal, AbortSignal.timeout(timeoutMs)]);
  let stopPolling: (() => void) | undefined;

  return {
    controller,
    signal,
    poll(intervalMs: number, check: () => Promise<unknown>) {
      stopPolling?.();
      stopPolling = pollUntilAborted(controller, intervalMs, check);
    },
    stop() {
      stopPolling?.();
      controller.abort();
    },
  };
}
