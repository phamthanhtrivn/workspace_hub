const SAFE_PROVIDER_CODES = new Set([
  "no_available_channel",
  "channel_not_found",
  "model_not_found",
  "rate_limit_exceeded",
  "insufficient_quota",
  "invalid_api_key",
  "convert_request_failed",
  "upstream_error",
  "server_error",
  "service_unavailable",
  "overloaded",
  "invalid_image",
  "invalid_request_error",
]);

export async function providerErrorMetadata(response: Response) {
  const reader = response.body?.getReader();
  if (!reader) return { provider_code: "unknown", category: "unknown" };
  const parts: Uint8Array[] = [];
  let bytes = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      bytes += value.length;
      if (bytes > 8192)
        return { provider_code: "unknown", category: "unknown" };
      parts.push(value);
    }
    const body = JSON.parse(Buffer.concat(parts).toString("utf8")) as {
      error?: { code?: unknown; message?: unknown };
    };
    const code =
      typeof body?.error?.code === "string" &&
      SAFE_PROVIDER_CODES.has(body.error.code)
        ? body.error.code
        : "unknown";
    // Inspect messages in memory only. Never return/log upstream prose, headers or bodies.
    const text =
      `${code} ${typeof body?.error?.message === "string" ? body.error.message : ""}`.toLowerCase();
    const category =
      /no.available.channel|channel.not.found|model.not.found/.test(text)
        ? "channel_unavailable"
        : /rate.limit|insufficient.quota|quota.exceeded/.test(text)
          ? "quota"
          : /invalid.api.key|authentication|unauthorized/.test(text)
            ? "authentication"
            : /overload|too.busy/.test(text)
              ? "overloaded"
              : /invalid.image|unsupported.image/.test(text)
                ? "image_rejected"
                : "unknown";

    return { provider_code: code, category };
  } catch {
    return { provider_code: "unknown", category: "unknown" };
  } finally {
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}
