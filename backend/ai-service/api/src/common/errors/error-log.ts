const SAFE_CODES = new Set([
  "ECONNREFUSED",
  "ECONNRESET",
  "ETIMEDOUT",
  "ENOTFOUND",
  "EAI_AGAIN",
  "EPIPE",
  "NR_CLOSED",
  "23505",
  "40001",
  "40P01",
  "53300",
  "57014",
  "57P01",
  "08000",
  "08001",
  "08003",
  "08006",
]);

export function logError(
  event: string,
  error: unknown,
  context: Record<string, string | number | boolean | undefined> = {},
) {
  const code = (error as { code?: unknown } | null)?.code;
  // Messages, stacks and upstream bodies can contain prompts or credentials.
  console.error(
    JSON.stringify({
      event,
      ...context,
      error_type:
        error instanceof Error ? error.constructor.name : "UnknownError",
      ...(typeof code === "string" && SAFE_CODES.has(code)
        ? { error_code: code }
        : {}),
    }),
  );
}
