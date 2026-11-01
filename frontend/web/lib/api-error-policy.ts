import { isAxiosError, isCancel, type AxiosRequestConfig } from "axios";

declare module "axios" {
  interface AxiosRequestConfig {
    errorPolicy?: "feature-sync";
  }
}

const BACKGROUND_REQUEST_TIMEOUT_MS = 10_000;
const RECOVERABLE_STATUSES = new Set([502, 503, 504]);
const CONNECTION_ERROR_CODES = new Set(["ERR_NETWORK", "ECONNABORTED", "ETIMEDOUT"]);

export function isRecoverableApiError(error: unknown): boolean {
  return !isCancel(error) && isAxiosError(error) && (
    error.response ? RECOVERABLE_STATUSES.has(error.response.status)
      : CONNECTION_ERROR_CODES.has(error.code ?? "")
  );
}

/** The feature owns recovery/UI; auth and unexpected-error handling still apply. */
export function featureSyncRequest(signal?: AbortSignal): AxiosRequestConfig {
  return { signal, timeout: BACKGROUND_REQUEST_TIMEOUT_MS, errorPolicy: "feature-sync" };
}
