import { type AxiosInstance, type AxiosRequestConfig } from "axios";
import { api } from "@/lib/axios";
import { MEETING_EXPECTED_BUSINESS_ERRORS } from "../types/meeting-error.constants";
import { meetingRoomRequestSignal } from "./meeting-room-requests";

function options(
  url: string,
  config: AxiosRequestConfig | undefined,
  method: string,
): AxiosRequestConfig {
  const roomSignal = meetingRoomRequestSignal(url, method);
  const signal =
    roomSignal && config?.signal
      ? AbortSignal.any([roomSignal, config.signal as AbortSignal])
      : (roomSignal ?? config?.signal);
  return {
    ...config,
    signal,
    expectedBusinessErrors: MEETING_EXPECTED_BUSINESS_ERRORS,
  };
}

/** Reuses the existing authenticated client; only Meeting opts in to its business responses. */
export const meetingHttp: Pick<
  AxiosInstance,
  "get" | "post" | "patch" | "put" | "delete"
> = {
  get: (url, config) => api.get(url, options(url, config, "GET")),
  post: (url, body, config) =>
    api.post(url, body, options(url, config, "POST")),
  patch: (url, body, config) =>
    api.patch(url, body, options(url, config, "PATCH")),
  put: (url, body, config) => api.put(url, body, options(url, config, "PUT")),
  delete: (url, config) => api.delete(url, options(url, config, "DELETE")),
};
