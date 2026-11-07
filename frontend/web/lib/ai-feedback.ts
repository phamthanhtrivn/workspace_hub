import axios from "axios";
import { getPermissionErrorMessage } from "./permission-feedback";

// Use only for service feedback, never for user content or generated answers.
export function aiServiceMessage(message: unknown, fallback: string): string {
  return typeof message === "string" && message.trim() &&
    !/[\u00c0-\u024f\u1e00-\u1eff]/.test(message)
    ? message
    : fallback;
}

export function aiErrorMessage(error: unknown, fallback: string): string {
  const permissionMessage = getPermissionErrorMessage(error);
  if (permissionMessage) return permissionMessage;
  if (axios.isAxiosError(error)) {
    const message = error.response?.data?.message;
    switch (error.response?.status) {
      case 401: return "Your session has expired. Sign in again to continue.";
      case 403: return "You can't use this AI action. Ask the resource owner to review your access.";
      case 409: return aiServiceMessage(message, "This request conflicts with the current state. Reopen the conversation or notebook, then try again.");
      case 413: return "This file is too large. Choose a smaller file and try again.";
      case 429: return "Too many AI requests. Wait a minute, then try again.";
      case 503: return "AI is unavailable. Try again later.";
      default: return aiServiceMessage(message, fallback);
    }
  }
  // Locally created errors may include a user's file name. Preserve it.
  return error instanceof Error ? error.message : fallback;
}

export function assistantStatus(message: string): string {
  const days = /\b(7|30)\b/.exec(message)?.[1];
  if (days) return `Reviewing the past ${days} days...`;
  return aiServiceMessage(message, "Reviewing your tasks...");
}
