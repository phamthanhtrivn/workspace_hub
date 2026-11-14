import { config } from "../../config/env.config";
import type { Citation } from "../../common/types";
import { admitModel } from "../../common/model-quota";
import { waitForModelAdmission } from "../../common/model-admission";
import { providerFetch } from "./provider-http";
import { providerEvents } from "./provider-events";
import { notebookPrompt, type NotebookModelOptions } from "./notebook-prompt";

export async function* modelAnswer(
  question: string,
  evidence: Citation[],
  signal: AbortSignal,
  clarification?: NotebookModelOptions,
) {
  const started = performance.now();
  const { system, prompt, images } = notebookPrompt(
    question,
    evidence,
    clarification,
  );
  await waitForModelAdmission(
    () =>
      admitModel(
        Math.ceil(
          Buffer.byteLength(
            JSON.stringify([
              { role: "system", content: system },
              { role: "user", content: prompt },
            ]),
          ) / 3,
        ) +
          config.LLM_MAX_TOKENS +
          images.length * 1024,
      ),
    signal,
    0,
  );
  signal.throwIfAborted();
  const timeout = AbortSignal.timeout(config.LLM_TIMEOUT_MS);
  const response = await providerFetch(
    `${config.LLM_BASE_URL.replace(/\/$/, "")}/chat/completions`,
    {
      method: "POST",
      signal: AbortSignal.any([signal, timeout]),
      redirect: "error",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${config.LLM_API_KEY}`,
      },
      body: JSON.stringify({
        model: config.LLM_MODEL,
        stream: true,
        max_tokens: config.LLM_MAX_TOKENS,
        temperature: 0.1,
        messages: [
          {
            role: "system",
            content: system,
          },
          {
            role: "user",
            content: images.length
              ? [
                  { type: "text", text: prompt },
                  ...images.flatMap((image) => [
                    {
                      type: "text",
                      text: `Document image for citation [[${image.label}]]:`,
                    },
                    { type: "image_url", image_url: { url: image.dataUrl } },
                  ]),
                ]
              : prompt,
          },
        ],
      }),
    },
  );
  if (!response.ok || !response.body) {
    await response.body?.cancel().catch(() => {});
    throw new Error(`Nhà cung cấp AI trả HTTP ${response.status}`);
  }
  let stopped = false;
  const scoped = !!clarification?.onOutOfScope;
  const markers = scoped
    ? ["[[ANSWER]]", "[[CLARIFY]]", "[[OUT_OF_SCOPE]]"]
    : ["[[CLARIFY]]"];
  let prefix = "";
  let prefixResolved = !(clarification?.onClarification || scoped);
  let finishReason: string | null = null;
  let contentChars = 0;
  let reasoningChars = 0;
  try {
    for await (const data of providerEvents(response.body)) {
      const event = JSON.parse(data) as {
        error?: unknown;
        choices?: {
          delta?: { content?: string; reasoning_content?: string };
          finish_reason?: string;
        }[];
      };
      if (event.error)
        throw new Error("Nhà cung cấp AI không hoàn tất câu trả lời");
      const choice = event.choices?.[0];
      if (choice?.finish_reason) finishReason = choice.finish_reason;
      contentChars += choice?.delta?.content?.length ?? 0;
      reasoningChars += choice?.delta?.reasoning_content?.length ?? 0;
      if (choice?.finish_reason === "stop") stopped = true;
      if (choice?.delta?.content) {
        if (prefixResolved) {
          yield choice.delta.content;
        } else {
          prefix += choice.delta.content;
          const trimmed = prefix.trimStart();
          const marker = markers.find((item) => trimmed.startsWith(item));
          if (marker) {
            prefixResolved = true;
            if (marker === "[[OUT_OF_SCOPE]]") {
              clarification?.onOutOfScope?.();

              return;
            }
            if (marker === "[[CLARIFY]]") {
              clarification?.onClarification?.();
            }
            const text = trimmed.slice(marker.length).trimStart();
            if (text) yield text;
          } else if (!markers.some((item) => item.startsWith(trimmed))) {
            if (scoped) throw new Error("AI chưa xác định phạm vi câu hỏi");
            prefixResolved = true;
            yield prefix;
          }
        }
      }
      if (choice?.finish_reason === "length")
        throw new Error(
          `Câu trả lời bị cắt ở giới hạn ${config.LLM_MAX_TOKENS} token. Phần đã hiển thị chưa hoàn tất. Hãy hỏi một phần nội dung cụ thể hơn.`,
        );
    }
    if (!stopped) throw new Error("Kết nối AI kết thúc trước khi hoàn tất");
    if (!prefixResolved) throw new Error("AI chưa hoàn tất câu hỏi làm rõ");
  } finally {
    console.info(
      JSON.stringify({
        event: "ai_model",
        model: config.LLM_MODEL,
        output_limit: config.LLM_MAX_TOKENS,
        finish_reason: finishReason,
        content_chars: contentChars,
        reasoning_chars: reasoningChars,
        duration_ms: Math.round(performance.now() - started),
        aborted: signal.aborted,
      }),
    );
  }
}
