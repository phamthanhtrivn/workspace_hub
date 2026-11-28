/** Concurrent callers share the in-flight run; the next call after it settles starts a new one. */
export function singleFlight<T>(run: () => Promise<T>) {
  let pending: Promise<T> | undefined;

  return () => {
    pending ??= run().finally(() => {
      pending = undefined;
    });

    return pending;
  };
}
