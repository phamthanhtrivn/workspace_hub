import type { ChatMediaResponse } from "../types/chat.types";

export function summaryAttachments(medias?: ChatMediaResponse[]) {
  return (medias ?? []).filter((file) =>
    !!file.id && /\.(pdf|docx|txt|md)$/i.test(file.name) &&
    Number.isSafeInteger(file.sizeBytes) && file.sizeBytes > 0 && file.sizeBytes <= 20 * 1024 * 1024,
  );
}

export function attachmentSummaryPrompt(name: string) {
  return `@ai Tóm tắt tài liệu “${name.replace(/[\r\n]/g, " ").slice(0, 300)}”.`;
}
