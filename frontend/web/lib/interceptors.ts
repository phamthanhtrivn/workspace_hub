import axios from "axios";
import { api } from "./axios";
import { store } from "@/store/store";
import { endSession, getSessionEpoch, redirectToLoginIfNeeded, sessionRecovery } from "@/features/auth/api/session-recovery";
import { getExpectedApiConflictMessage, isRecoverableApiError } from "./api-error-policy";
import { isEmailVerificationLoginError } from "@/features/auth/utils/auth-error";
import { getPermissionErrorMessage } from "./permission-feedback";

const API_ERROR_LOG_THROTTLE_MS = 10_000;
const apiErrorLogTimes = new Map<string, number>();

declare module "axios" {
  interface AxiosRequestConfig {
    sessionEpoch?: number;
  }
}
export function logApiError(error: unknown, context = "API request failed") {
  if (axios.isCancel(error)) return;

  if (!axios.isAxiosError(error)) {
    console.error(context, error);
    return;
  }

  if (isEmailVerificationLoginError(error) || getExpectedApiConflictMessage(error)) return;

  const method = error.config?.method?.toUpperCase() || "UNKNOWN";
  const url = error.config?.url || "unknown-url";
  const responseData = error.response?.data as
    | { message?: string; error?: string }
    | string
    | undefined;
  const message =
    typeof responseData === "string"
      ? responseData
      : responseData?.message || responseData?.error || error.message;
  const status = error.response?.status || "";
  const gatewayHint = error.response
    ? undefined
    : "Gateway/upstream service may not be ready, or the connection was reset before an HTTP response.";
  const handledSyncFailure = error.config?.errorPolicy === "feature-sync" && isRecoverableApiError(error);
  const logKey = `${handledSyncFailure ? "feature-sync" : "default"}:${context}:${method}:${url}:${status}:${message}`;
  const now = Date.now();
  const lastLoggedAt = apiErrorLogTimes.get(logKey) || 0;

  if (now - lastLoggedAt < API_ERROR_LOG_THROTTLE_MS) return;
  apiErrorLogTimes.set(logKey, now);

  const log = handledSyncFailure || getPermissionErrorMessage(error) ? console.warn : console.error;
  log(context, {
    method,
    url,
    status,
    message,
    ...(gatewayHint ? { gatewayHint } : {}),
  });
}

// ── Request Interceptor: attach accessToken from Redux ──
api.interceptors.request.use(
  (config) => {
    if (config.sessionEpoch !== undefined && config.sessionEpoch !== getSessionEpoch()) {
      throw new axios.CanceledError("Session changed before request retry");
    }
    const token = store.getState().auth.accessToken;

    if (token && !config.url?.includes("/api/auth")) {
      config.headers.Authorization = `Bearer ${token}`;
      config.sessionEpoch ??= getSessionEpoch();
    }

    return config;
  },
  (error) => Promise.reject(error),
);

// HTTP and WebSocket authentication failures share the refresh coordinator.
api.interceptors.response.use(
  response => response,
  async error => {
    const originalRequest = error.config;
    if (error.response?.status !== 401 || !originalRequest) {
      logApiError(error);
      return Promise.reject(error);
    }
    if (originalRequest.url?.includes("/api/auth/")) return Promise.reject(error);
    if (originalRequest.sessionEpoch !== getSessionEpoch()) return Promise.reject(error);
    const snapshot = store.getState().auth;
    const currentToken = snapshot.accessToken;
    if (!currentToken) {
      redirectToLoginIfNeeded();
      return Promise.reject(error);
    }
    if (originalRequest.headers.Authorization !== 'Bearer ' + currentToken) {
      originalRequest.headers.Authorization = 'Bearer ' + currentToken;
      return api(originalRequest);
    }
    if (originalRequest._retry) {
      await endSession(snapshot);
      return Promise.reject(error);
    }
    originalRequest._retry = true;
    try {
      const token = await sessionRecovery.refreshForToken(currentToken);
      if (!token) return Promise.reject(error);
      originalRequest.headers.Authorization = 'Bearer ' + token;
      return api(originalRequest);
    } catch (refreshError) {
      return Promise.reject(refreshError);
    }
  },
);
