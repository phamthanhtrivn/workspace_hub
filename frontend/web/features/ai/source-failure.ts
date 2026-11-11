import { aiServiceMessage } from "@/lib/ai-feedback";

export function sourceFailure(error: string | null) {
  const text = error ?? "";
  if (/40[.,]000 tokens?/i.test(text))
    return {
      message:
        "This file hit the previous 40,000-token limit. The limit is now 100,000 tokens. Retry to check this file again.",
      canRetry: true,
    };
  const limits: [RegExp, string][] = [
    [
      /VISUAL_PAGE_LIMIT|vượt 24 trang\/hình|16 MiB ảnh trích xuất/i,
      "This file exceeds the Vision limit: 24 pages/images requiring analysis or 16 MiB of extracted images. Split it into smaller files and upload them again. Retrying the unchanged file will not help.",
    ],
    [
      /SOURCE_TOKEN_LIMIT|vượt 100[.,]000 token|exceeds 100[.,]000 tokens/i,
      "This file exceeds 100,000 tokens. Split it into smaller files and upload them again.",
    ],
    [
      /PDF_PAGE_LIMIT|PDF vượt 100 trang/i,
      "This PDF exceeds 100 pages. Split it into smaller files and upload them again.",
    ],
    [
      /DOCX_EXPANDED_LIMIT|sau giải nén vượt 100 MiB/i,
      "This DOCX exceeds 100 MiB after decompression. Reduce its images or split the file before uploading again.",
    ],
  ];
  for (const [pattern, message] of limits) {
    if (pattern.test(text)) return { message, canRetry: false };
  }

  return {
    message: aiServiceMessage(
      error,
      "Unable to process this source. Check its format and limits, then retry.",
    ),
    canRetry: true,
  };
}
