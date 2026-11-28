import { isAxiosError } from "axios";

export type PushSetupStep =
  | "permission"
  | "service-worker"
  | "vapid-key"
  | "browser-subscription"
  | "save-subscription";
export interface PushSetupDiagnostic {
  step: PushSetupStep;
  status?: number;
  reason: string;
  endpointHost?: string;
  hint?: string;
}

export function getPushSetupDiagnostic(
  error: unknown,
  step: PushSetupStep,
  endpoint?: string,
): PushSetupDiagnostic {
  const result: PushSetupDiagnostic = {
    step,
    reason:
      error instanceof Error ? error.message : "Unknown Web Push setup error",
  };
  if (endpoint) {
    try {
      result.endpointHost = new URL(endpoint).hostname;
    } catch {
      /* Never log the raw endpoint. */
    }
  }
  if (isAxiosError<unknown>(error)) {
    result.status = error.response?.status;
    const body = error.response?.data;
    if (body && typeof body === "object") {
      const response = body as { message?: unknown; errors?: unknown };
      const messages: string[] = [];
      if (typeof response.message === "string") messages.push(response.message);
      else if (Array.isArray(response.message))
        messages.push(
          ...response.message.filter(
            (message): message is string => typeof message === "string",
          ),
        );
      if (response.errors && typeof response.errors === "object")
        messages.push(
          ...Object.values(response.errors).filter(
            (message): message is string => typeof message === "string",
          ),
        );
      if (messages.length) result.reason = messages.join("; ");
    }
  }
  if (result.reason.includes("Push endpoint is not allowed"))
    result.hint =
      "Check this exact provider hostname in notification-service WEB_PUSH_ALLOWED_HOSTS. Bell notifications do not require Web Push.";
  else if (result.reason.includes("Too many push subscriptions"))
    result.hint =
      "The account has reached the configured browser subscription limit.";

  return result;
}
