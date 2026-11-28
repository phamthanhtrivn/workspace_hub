import { HttpException, Logger } from "@nestjs/common";

export const SESSION_ERROR_EVENT = "session:error";
export const SESSION_AUTH_CODE = {
  TOKEN_EXPIRED: "TOKEN_EXPIRED",
  TOKEN_INVALID: "TOKEN_INVALID",
  SESSION_REVOKED: "SESSION_REVOKED",
  AUTH_SERVICE_UNAVAILABLE: "AUTH_SERVICE_UNAVAILABLE",
  AUTH_CONFIGURATION_ERROR: "AUTH_CONFIGURATION_ERROR",
} as const;
export type SessionAuthCode =
  (typeof SESSION_AUTH_CODE)[keyof typeof SESSION_AUTH_CODE];
const MESSAGES: Record<SessionAuthCode, string> = {
  TOKEN_EXPIRED: "Access token has expired",
  TOKEN_INVALID: "A valid access token is required",
  SESSION_REVOKED: "Session is no longer active",
  AUTH_SERVICE_UNAVAILABLE: "Session authorization unavailable",
  AUTH_CONFIGURATION_ERROR: "Session authorization is not configured correctly",
};
export class SessionAuthError extends HttpException {
  constructor(readonly code: SessionAuthCode) {
    const status = code.startsWith("AUTH_") ? 503 : 401;
    super(
      {
        statusCode: status,
        message: MESSAGES[code],
        error: status === 503 ? "Service Unavailable" : "Unauthorized",
      },
      status,
    );
  }
}
export function sessionErrorPayload(error: unknown) {
  const code =
    error instanceof SessionAuthError
      ? error.code
      : SESSION_AUTH_CODE.AUTH_SERVICE_UNAVAILABLE;
  return { code, message: MESSAGES[code] };
}
const logger = new Logger("SocketSession");
const lastLogged = new Map<string, number>();
const LOG_THROTTLE_MS = 10_000;
export function logSessionError(error: unknown, stage: string): void {
  const { code } = sessionErrorPayload(error);
  const key = stage + ":" + code;
  const now = Date.now();
  if (now - (lastLogged.get(key) ?? 0) < LOG_THROTTLE_MS) return;
  lastLogged.set(key, now);
  logger.warn({ service: "project-service", stage, code });
}
export function socketHandshakeError(
  error: unknown,
): Error & { data: { code: SessionAuthCode } } {
  const { code, message } = sessionErrorPayload(error);
  return Object.assign(new Error(message), { data: { code } });
}
export function disconnectSessionSocket(
  socket: {
    emit(
      event: string,
      payload: ReturnType<typeof sessionErrorPayload>,
    ): unknown;
    disconnect(close?: boolean): unknown;
  },
  error: unknown,
  stage: string,
): void {
  logSessionError(error, stage);
  socket.emit(SESSION_ERROR_EVENT, sessionErrorPayload(error));
  socket.disconnect(true);
}
