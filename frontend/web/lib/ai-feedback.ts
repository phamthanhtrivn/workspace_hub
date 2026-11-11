import axios from "axios";
import { getPermissionErrorMessage } from "./permission-feedback";

// Use only for service feedback, never for user content or generated answers.
export function aiServiceMessage(message: unknown, fallback: string): string {
  const diagnostic = aiDiagnosticMessage(message);
  if (diagnostic) return diagnostic;

  return typeof message === "string" &&
    message.trim() &&
    !/[\u00c0-\u024f\u1e00-\u1eff]/.test(message)
    ? message
    : fallback;
}

export function aiDiagnosticMessage(message: unknown): string | null {
  if (typeof message !== "string") return null;
  if (/AI_DATABASE_UNAVAILABLE/.test(message))
    return "The AI database is unavailable. Your files do not need to be uploaded again.";
  if (/AI_QUEUE_UNAVAILABLE/.test(message))
    return "The AI processing worker or queue is unavailable. Try again after the service recovers.";
  if (/AI_DEPENDENCIES_UNAVAILABLE/.test(message))
    return "Document retrieval is unavailable. Try again after the document services recover.";
  if (/VISION_DAILY_QUOTA/.test(message))
    return "Today's image-reading budget has been reached. It resets at 00:00 UTC (07:00 Vietnam time). Chat may still be available.";
  if (/MODEL_DAILY_QUOTA/.test(message))
    return "Today's AI request limit has been reached. It resets at 00:00 UTC (07:00 Vietnam time).";
  if (/MODEL_INPUT_BUDGET/.test(message))
    return "This request exceeds the token budget. Ask about a smaller section.";
  if (/RAG_FALLBACK_PENDING|Documents are being prepared/.test(message))
    return "Preparing the document index with the local model in the background. Try again shortly.";
  if (/VISION_INCOMPLETE/.test(message))
    return "Image analysis did not finish. Completed images are saved. Retry explicitly when the provider is available.";

  return null;
}

export function aiErrorMessage(error: unknown, fallback: string): string {
  const permissionMessage = getPermissionErrorMessage(error);
  if (permissionMessage) return permissionMessage;
  if (axios.isAxiosError(error)) {
    const message = error.response?.data?.message;
    const diagnostic = aiDiagnosticMessage(message);
    if (diagnostic) return diagnostic;
    switch (error.response?.status) {
      case 401:
        return "Your session has expired. Sign in again to continue.";
      case 403:
        return "You can't use this AI action. Ask the resource owner to review your access.";
      case 409:
        return aiServiceMessage(
          message,
          "This request conflicts with the current state. Reopen the conversation or notebook, then try again.",
        );
      case 413:
        return "This file is too large. Choose a smaller file and try again.";
      case 429:
        return "Too many AI requests. Wait a minute, then try again.";
      case 503:
        return "AI is unavailable. Try again later.";
      default:
        return aiServiceMessage(message, fallback);
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
