const RETRYABLE_HTTP_STATUSES = new Set([408, 425, 429]);
const RETRYABLE_NETWORK_CODES = new Set([
  "ECONNRESET",
  "ECONNREFUSED",
  "EPIPE",
  "ETIMEDOUT",
  "EAI_AGAIN",
]);

export function isRetryableVoiceFailure(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  if ("status" in error && typeof error.status === "number")
    return RETRYABLE_HTTP_STATUSES.has(error.status) || error.status >= 500;
  if (
    error instanceof TypeError ||
    ["TimeoutError", "AbortError"].includes(error.name)
  )
    return true;
  if (
    "code" in error &&
    typeof error.code === "string" &&
    RETRYABLE_NETWORK_CODES.has(error.code)
  )
    return true;
  return error.cause !== undefined && error.cause !== error
    ? isRetryableVoiceFailure(error.cause)
    : false;
}
