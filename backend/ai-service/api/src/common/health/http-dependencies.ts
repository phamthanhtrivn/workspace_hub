import { config } from "../../config/env.config";
import { SESSION_AUTHORIZATION_PATH } from "../auth/session-authorization";
import {
  internalPost,
  serviceUrl,
} from "../../infrastructure/integrations/internal-http";

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
    internalPost(
      new URL(
        SESSION_AUTHORIZATION_PATH,
        process.env.USER_SERVICE_URL,
      ).toString(),
      { key: process.env.AI_TO_USER_KEY || "", timeoutMs: 3000 },
    ),
    // A correctly authenticated malformed request reaches validation (400),
    // without accessing any user's documents or generating presigned URLs.
    internalPost(
      serviceUrl(
        config.DOCUMENT_SERVICE_URL,
        "/internal/notebook-documents/resolve",
      ),
      { key: config.AI_DOCUMENT_SERVICE_KEY, timeoutMs: 3000 },
    ),
  ]);
  const responses = results.flatMap((result) =>
    result.status === "fulfilled" ? [result.value] : [],
  );
  try {
    const rag = results[0].status === "fulfilled" ? results[0].value : null;
    const document = results.at(-1);
    const documentResponse =
      document?.status === "fulfilled" ? document.value : null;
    const session = results.at(-2);
    const sessionResponse =
      session?.status === "fulfilled" ? session.value : null;
    if (
      !rag?.ok ||
      documentResponse?.status !== 400 ||
      sessionResponse?.status !== 400
    )
      throw new Error("AI dependency unavailable or misconfigured");
    const speech =
      speechEnabled && results[1].status === "fulfilled" && results[1].value.ok;

    return { notebook: true, speech: Boolean(speech) };
  } finally {
    await Promise.all(responses.map((response) => response.body?.cancel()));
  }
}
