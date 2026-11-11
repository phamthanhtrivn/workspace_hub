import { isProviderConnectTimeout } from "../../infrastructure/integrations/provider-http";
import { ModelMinuteQuotaException } from "../../common/errors/model-quota.exception";
import { TooManyRequestsException } from "../../common/errors/rate-limit.exception";
import { HttpException } from "@nestjs/common";

export function notebookFailureMessage(error: unknown): string {
  if (isProviderConnectTimeout(error))
    return "Could not connect to the AI provider. Please try again.";
  if (
    error instanceof ModelMinuteQuotaException ||
    error instanceof TooManyRequestsException
  )
    return "The AI request limit has been reached. Wait a minute before trying again.";
  if (error instanceof Error && error.name === "TimeoutError")
    return "The AI request timed out. It was not resent automatically.";
  if (error instanceof HttpException && [401, 403].includes(error.getStatus()))
    return "Source access could not be verified. Refresh the notebook and check your permissions.";
  const message = error instanceof Error ? error.message : "";
  const status = /HTTP (\d{3})\b/.exec(message)?.[1];
  if (status === "429")
    return "The AI provider is rate limiting requests. Wait before trying again.";
  if (status === "401" || status === "403")
    return "The AI provider rejected access. Check the provider credentials and model permissions.";
  if (status)
    return `An AI dependency returned HTTP ${status}. Please try again later.`;
  if (/bị cắt ở giới hạn/.test(message))
    return "The AI response reached its output limit. Use Full summary for longer documents.";
  if (/trích dẫn/.test(message))
    return "The AI response did not include valid source citations. Please try again.";
  if (/phạm vi|làm rõ/.test(message))
    return "The AI returned an invalid response format. Please try again.";
  if (/Nguồn đã thay đổi|phiên bản|Mất quyền/.test(message))
    return "Source access or version changed. Refresh the notebook and select your sources again.";
  if (/RAG|chỉ mục|Chỉ mục/.test(message))
    return "Document retrieval is unavailable or incomplete. Check source status before trying again.";
  if (/kết thúc trước khi hoàn tất|không hoàn tất/.test(message))
    return "The AI response was interrupted before completion. It was not resent automatically.";
  if (/vượt giới hạn|quá dài|size limit/.test(message))
    return "The response exceeds the size limit. Ask about a smaller section.";

  return "AI could not complete the request. Please try again; the request was not resent automatically.";
}
