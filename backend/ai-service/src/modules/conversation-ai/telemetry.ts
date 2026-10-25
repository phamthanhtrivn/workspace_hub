export async function measureConversationStage<T>(
  stage: "history" | "tasks" | "download" | "extract" | "model",
  run: () => Promise<T>,
) {
  const started = performance.now();
  let status = "failed";
  let usage: unknown;
  try {
    const result = await run();
    if (stage === "model") {
      const value = result as { usage_metadata?: {
        input_tokens?: number; output_tokens?: number; total_tokens?: number;
      } };
      if (value?.usage_metadata) {
        const { input_tokens, output_tokens, total_tokens } = value.usage_metadata;
        usage = { input_tokens, output_tokens, total_tokens };
      }
    }
    status = "ok";
    return result;
  } finally {
    console.info(JSON.stringify({ event: "conversation_stage", stage, status,
      duration_ms: Math.round(performance.now() - started), usage }));
  }
}
