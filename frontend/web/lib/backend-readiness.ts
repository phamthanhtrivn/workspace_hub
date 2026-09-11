import axios from "axios";

const DEFAULT_API_BASE_URL = "http://localhost:8000";
const READY_CACHE_MS = 10_000;

export const BACKEND_HEALTH_PATHS = {
  notification: "/health/notification",
} as const;

let lastReadyAt = 0;

type WaitForBackendReadyOptions = {
  attempts?: number;
  delayMs?: number;
  timeoutMs?: number;
};

export function getApiBaseUrl(): string {
  return process.env.NEXT_PUBLIC_API_URL || DEFAULT_API_BASE_URL;
}

export async function waitForBackendReady(
  path: string,
  options: WaitForBackendReadyOptions = {},
): Promise<boolean> {
  const attempts = options.attempts ?? 3;
  const delayMs = options.delayMs ?? 1_000;
  const timeoutMs = options.timeoutMs ?? 4_000;

  if (Date.now() - lastReadyAt < READY_CACHE_MS) {
    return true;
  }

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      await axios.get(`${getApiBaseUrl()}${path}`, {
        timeout: timeoutMs,
        withCredentials: true,
      });
      lastReadyAt = Date.now();
      return true;
    } catch {
      if (attempt < attempts) {
        await sleep(delayMs);
      }
    }
  }

  return false;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => globalThis.setTimeout(resolve, ms));
}
