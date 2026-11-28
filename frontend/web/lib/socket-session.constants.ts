export const SESSION_ERROR_EVENT = "session:error";
export const SOCKET_AUTH_CODE = {
  TOKEN_EXPIRED: "TOKEN_EXPIRED",
  TOKEN_INVALID: "TOKEN_INVALID",
  SESSION_REVOKED: "SESSION_REVOKED",
  AUTH_SERVICE_UNAVAILABLE: "AUTH_SERVICE_UNAVAILABLE",
  AUTH_CONFIGURATION_ERROR: "AUTH_CONFIGURATION_ERROR",
} as const;
export type SocketAuthCode =
  (typeof SOCKET_AUTH_CODE)[keyof typeof SOCKET_AUTH_CODE];
export interface SocketSessionError {
  code: SocketAuthCode;
  message?: string;
}
export const SOCKET_RETRY = {
  initialDelayMs: 1_000,
  maxDelayMs: 30_000,
  timeoutMs: 5_000,
  logThrottleMs: 10_000,
} as const;

export function readSocketAuthCode(error: unknown): SocketAuthCode | undefined {
  if (!error || typeof error !== "object") return;
  const payload = "data" in error ? error.data : error;
  if (!payload || typeof payload !== "object" || !("code" in payload)) return;
  return Object.values(SOCKET_AUTH_CODE).find((code) => code === payload.code);
}
