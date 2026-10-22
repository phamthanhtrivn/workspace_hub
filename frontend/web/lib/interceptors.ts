import axios from "axios";
import { api } from "./axios";
import { store } from "@/store/store";
import { setCredentials, clearCredentials } from "@/store/auth/auth-slice";
import { refreshApi } from "@/features/auth/api/auth.api";
import { getLoginRedirectPath } from "@/features/auth/utils/auth-redirect";

const API_ERROR_LOG_THROTTLE_MS = 10_000;
const apiErrorLogTimes = new Map<string, number>();
const PUBLIC_PATHS = [
  "/login",
  "/register",
  "/forgot-password",
  "/",
  "/documents/shared",
];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some(
    (path) => pathname === path || pathname.startsWith(path + "/"),
  );
}

export function logApiError(error: unknown, context = "API request failed") {
  if (axios.isCancel(error)) return;

  if (!axios.isAxiosError(error)) {
    console.error(context, error);
    return;
  }

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
  const logKey = `${context}:${method}:${url}:${status}:${message}`;
  const now = Date.now();
  const lastLoggedAt = apiErrorLogTimes.get(logKey) || 0;

  if (now - lastLoggedAt < API_ERROR_LOG_THROTTLE_MS) return;
  apiErrorLogTimes.set(logKey, now);

  console.error(context, {
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
    const token = store.getState().auth.accessToken;

    if (token && !config.url?.includes("/api/auth")) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error),
);

// ── Response Interceptor: auto-refresh on 401 ──
let isRefreshing = false;
let failedQueue: {
  resolve: (value?: unknown) => void;
  reject: (reason?: unknown) => void;
}[] = [];

const processQueue = (error: unknown | null) => {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) {
      reject(error);
    } else {
      resolve();
    }
  });
  failedQueue = [];
};

function redirectToLoginIfNeeded() {
  if (typeof window === "undefined") return;

  if (isPublicPath(window.location.pathname)) return;

  window.location.assign(
    getLoginRedirectPath(window.location.pathname, window.location.search),
  );
}

async function endSession() {
  store.dispatch(clearCredentials());
  try {
    await axios.post(
      `${api.defaults.baseURL}/api/auth/logout`,
      {},
      { withCredentials: true },
    );
  } catch (error) {
    console.error("Lỗi xóa cookie:", error);
  }
  redirectToLoginIfNeeded();
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status !== 401 || !originalRequest) {
      logApiError(error);
      return Promise.reject(error);
    }

    // Don't try to refresh for auth endpoints themselves
    if (originalRequest.url?.includes("/api/auth/")) {
      return Promise.reject(error);
    }

    if (originalRequest._retry) {
      await endSession();
      return Promise.reject(error);
    }

    const currentToken = store.getState().auth.accessToken;
    if (!currentToken) {
      redirectToLoginIfNeeded();
      return Promise.reject(error);
    }

    originalRequest._retry = true;
    if (originalRequest.headers.Authorization !== `Bearer ${currentToken}`) {
      originalRequest.headers.Authorization = `Bearer ${currentToken}`;
      return api(originalRequest);
    }

    if (isRefreshing) {
      // Another refresh is in progress — queue this request
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      }).then(() => {
        // After refresh completes, retry with new token
        const newToken = store.getState().auth.accessToken;
        if (!newToken) return Promise.reject(error);
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      });
    }

    isRefreshing = true;

    try {
      const response = await refreshApi();
      const data = response.data;

      if (!data || !data.accessToken) {
        throw new Error("Chưa đăng nhập");
      }

      store.dispatch(
        setCredentials({
          accessToken: data.accessToken,
          userId: data.userId,
          email: data.email,
          role: data.role,
          fullName: data.fullName,
          avatarUrl: data.avatarUrl,
        }),
      );

      processQueue(null);

      // Retry the original request with new token
      originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
      return api(originalRequest);
    } catch (refreshError) {
      processQueue(refreshError);
      await endSession();

      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  },
);
