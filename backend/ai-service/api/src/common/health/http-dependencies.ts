import { config } from "../../config/env.config";

export async function checkHttpDependencies() {
  const speechEnabled =
    config.MEETING_SUMMARY_ENABLED === "true" ||
    config.VOICE_TRANSCRIPTION_ENABLED === "true";
  const results = await Promise.allSettled([
    fetch(`${config.RAG_WORKER_URL}/ready`, {
      headers: { "x-internal-service-key": config.RAG_SERVICE_KEY },
      signal: AbortSignal.timeout(3000),
      redirect: "error",
    }),
    ...(speechEnabled
      ? [
          fetch(config.MEETING_STT_URL.replace(/\/$/, "") + "/ready", {
            headers: {
              "x-internal-service-key": config.MEETING_STT_SERVICE_KEY,
            },
            signal: AbortSignal.timeout(3000),
            redirect: "error",
          }),
        ]
      : []),
    // A correctly authenticated malformed request reaches validation (400),
    // without accessing any user's documents or generating presigned URLs.
    fetch(
      `${config.DOCUMENT_SERVICE_URL}/internal/notebook-documents/resolve`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-internal-service-key": config.AI_DOCUMENT_SERVICE_KEY,
        },
        body: "{}",
        signal: AbortSignal.timeout(3000),
        redirect: "error",
      },
    ),
  ]);
  const responses = results.flatMap((result) =>
    result.status === "fulfilled" ? [result.value] : [],
  );
  try {
    if (
      responses.length !== (speechEnabled ? 3 : 2) ||
      !responses[0].ok ||
      responses.at(-1)?.status !== 400 ||
      (speechEnabled && !responses[1].ok)
    )
      throw new Error("AI dependency unavailable or misconfigured");
  } finally {
    await Promise.all(responses.map((response) => response.body?.cancel()));
  }
}
