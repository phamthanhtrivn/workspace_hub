export function pollUntilAborted(
  controller: AbortController,
  intervalMs: number,
  check: () => Promise<unknown>,
) {
  let checking = false;
  const timer = setInterval(async () => {
    if (checking || controller.signal.aborted) return;
    checking = true;
    try {
      await check();
    } catch {
      controller.abort();
    } finally {
      checking = false;
    }
  }, intervalMs);
  return () => clearInterval(timer);
}
