import { isAxiosError, isCancel, type AxiosRequestConfig } from "axios";

declare module "axios" {
  interface AxiosRequestConfig {
    errorPolicy?: "feature-sync";
    expectedConflictMessages?: readonly string[];
  }
}

const BACKGROUND_REQUEST_TIMEOUT_MS = 10_000;
const RECOVERABLE_STATUSES = new Set([502, 503, 504]);
const CONNECTION_ERROR_CODES = new Set(["ERR_NETWORK", "ECONNABORTED", "ETIMEDOUT"]);
const MUTATION_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

/** Features opt in to exact known conflicts; unrelated failures keep their logs. */
export function getExpectedApiConflictMessage(error: unknown): string | undefined {
  if (!isAxiosError(error) || error.response?.status !== 409 ||
    !MUTATION_METHODS.has(error.config?.method?.toUpperCase() ?? "")) return undefined;

  const payload: unknown = error.response.data;
  const message = typeof payload === "string" ? payload
    : payload && typeof payload === "object" && "message" in payload ? payload.message : undefined;
  return typeof message === "string" && error.config?.expectedConflictMessages?.includes(message)
    ? message : undefined;
}

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
