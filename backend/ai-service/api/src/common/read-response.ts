import { ServiceUnavailableException } from "@nestjs/common";

export async function readResponseText(
  response: Response,
  maxBytes: number,
  sizeError: Error = new ServiceUnavailableException(
    "Nguồn dữ liệu vượt giới hạn.",
  ),
) {
  if (Number(response.headers.get("content-length")) > maxBytes) {
    await response.body?.cancel();
    throw sizeError;
  }
  if (!response.body) return "";
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  const parts: string[] = [];
  let bytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > maxBytes) throw sizeError;
      parts.push(decoder.decode(value, { stream: true }));
    }
    parts.push(decoder.decode());

    return parts.join("");
  } finally {
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}
