/** Joins a configured service base URL and an absolute path. */
export function serviceUrl(base: string, path: string) {
  return base.replace(/\/$/, "") + path;
}

/**
 * JSON POST to another WorkSpaceHub service with its dedicated internal key.
 * Redirects are refused so the key is never forwarded to another host, and the
 * caller's signal is combined with an optional timeout.
 */
export function internalPost(
  url: string,
  options: {
    key: string;
    body?: unknown;
    signal?: AbortSignal;
    timeoutMs?: number;
  },
) {
  const signals = [
    options.signal,
    options.timeoutMs === undefined
      ? undefined
      : AbortSignal.timeout(options.timeoutMs),
  ].filter((signal) => signal !== undefined);

  return fetch(url, {
    method: "POST",
    redirect: "error",
    signal: signals.length ? AbortSignal.any(signals) : undefined,
    headers: {
      "content-type": "application/json",
      "x-internal-service-key": options.key,
    },
    body: JSON.stringify(options.body ?? {}),
  });
}
