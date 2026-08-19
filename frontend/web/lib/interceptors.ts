import axios from "axios";
import { api } from "./axios";
import { store } from "@/store/store";
import { setCredentials, clearCredentials } from "@/store/auth/auth-slice";
import { refreshApi } from "@/features/auth/api/auth.api";

const API_ERROR_LOG_THROTTLE_MS = 10_000;
const apiErrorLogTimes = new Map<string, number>();

export function logApiError(error: unknown, context = "API request failed") {
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

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Only handle 401 errors and avoid infinite loop
    if (error.response?.status !== 401 || originalRequest?._retry) {
      logApiError(error);
      return Promise.reject(error);
    }

    // Don't try to refresh for auth endpoints themselves
    if (
      originalRequest.url?.includes("/api/auth/login") ||
      originalRequest.url?.includes("/api/auth/register") ||
      originalRequest.url?.includes("/api/auth/refresh")
    ) {
      return Promise.reject(error);
    }

    if (isRefreshing) {
      // Another refresh is in progress — queue this request
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      }).then(() => {
        // After refresh completes, retry with new token
        const newToken = store.getState().auth.accessToken;
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      });
    }

    originalRequest._retry = true;
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
      store.dispatch(clearCredentials());

      try {
        await axios.post(
          `${process.env.NEXT_PUBLIC_API_URL}/api/auth/logout`,
          {},
          { withCredentials: true },
        );
      } catch (e) {
        console.error("Lỗi xóa cookie:", e);
      }

      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }

      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  },
);
