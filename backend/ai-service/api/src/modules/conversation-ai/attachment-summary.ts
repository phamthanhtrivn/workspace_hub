import { BadRequestException, ForbiddenException } from "@nestjs/common";
import { createChatModel } from "../../infrastructure/integrations/chat-model";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { z } from "zod";
import { resolveChatAttachment } from "../../infrastructure/integrations/document.client";
import { config } from "../../config/env.config";
import { completedModelText } from "../../common/model-response";
import { admitConversationModel } from "./model-admission";
import { measureConversationStage } from "./telemetry";
import { rag } from "../../infrastructure/integrations/rag.client";
import { downloadSource } from "../sources/upload-validation";
import { CONVERSATION_AI_MESSAGES } from "./conversation-ai.messages";
import {
  ATTACHMENT_SUMMARY_INSTRUCTIONS,
  presentAttachmentSummary,
} from "./attachment-summary-presentation";

const manifestSchema = z.object({
  name: z.string().min(1).max(300),
  sizeBytes: z
    .number()
    .int()
    .positive()
    .max(20 * 1024 * 1024),
  downloadUrl: z.url(),
});
const documentAttachmentSchema = manifestSchema
  .omit({ downloadUrl: true })
  .extend({
    document: z.object({
      userId: z.uuid(),
      s3Key: z.string().min(1).max(1024),
    }),
  });
const documentManifestSchema = z.object({
  documentId: z.uuid(),
  versionId: z.uuid(),
  revision: z.string().regex(/^[a-f0-9]{64}$/),
  sizeBytes: z
    .number()
    .int()
    .positive()
    .max(20 * 1024 * 1024),
  downloadUrl: z.url().optional(),
});
const extractionSchema = z.object({
  pages: z
    .array(
      z.object({
        text: z.string().max(500000),
        page: z.number().int().min(1).max(100).nullable(),
      }),
    )
    .max(100),
  images: z.array(z.unknown()).max(24).default([]),
});

export function attachmentExcerpts(
  pages: z.infer<typeof extractionSchema>["pages"],
  byteBudget = 24000,
) {
  const readable = pages.filter((p) => p.text.trim());
  if (!readable.length)
    throw new BadRequestException(CONVERSATION_AI_MESSAGES.noReadableText);
  let remaining = byteBudget;
  let truncated = false;
  const excerpts = readable.map((p, index) => {
    const bytes = Buffer.from(p.text);
    const allowance = Math.floor(remaining / (readable.length - index));
    const text =
      bytes.length <= allowance
        ? p.text
        : bytes
            .subarray(0, allowance)
            .toString("utf8")
            .replace(/\uFFFD$/, "");
    truncated ||= text !== p.text;
    remaining -= Buffer.byteLength(text);

    return { page: p.page, text };
  });

  return { excerpts, truncated };
}

export async function summarizeAttachment(
  requestId: string,
  readAttachment: () => Promise<unknown>,
  authorizeChat: () => Promise<unknown>,
  signal: AbortSignal,
  onSourceGuard?: (check: () => Promise<void>) => void,
  question = "Summarize this document.",
) {
  signal.throwIfAborted();
  await authorizeChat();
  const selected = z
    .union([manifestSchema, documentAttachmentSchema])
    .parse(await readAttachment());
  let checkDocument = async () => {};
  let manifest: z.infer<typeof manifestSchema>;
  if ("document" in selected) {
    const original = documentManifestSchema.parse(
      await resolveChatAttachment(selected.document, true, signal),
    );
    if (original.sizeBytes !== selected.sizeBytes || !original.downloadUrl)
      throw new ForbiddenException("Document version mismatch");
    manifest = {
      name: selected.name,
      sizeBytes: selected.sizeBytes,
      downloadUrl: original.downloadUrl,
    };
    checkDocument = async () => {
      const current = documentManifestSchema.parse(
        await resolveChatAttachment(selected.document, false, signal),
      );
      if (
        current.documentId !== original.documentId ||
        current.versionId !== original.versionId ||
        current.revision !== original.revision ||
        current.sizeBytes !== original.sizeBytes
      )
        throw new ForbiddenException("Document version changed");
    };
    onSourceGuard?.(checkDocument);
  } else {
    manifest = selected;
  }
  const authorize = async () => {
    await authorizeChat();
    await checkDocument();
  };
  const data = await measureConversationStage("download", () =>
    downloadSource(manifest, signal),
  );
  const extracted = extractionSchema.parse(
    await measureConversationStage("extract", () =>
      rag(
        "/extract",
        {
          scopeId: requestId,
          name: manifest.name,
          content: data.toString("base64"),
        },
        AbortSignal.any([signal, AbortSignal.timeout(120000)]),
      ),
    ),
  );
  const { excerpts, truncated } = attachmentExcerpts(extracted.pages);
  signal.throwIfAborted();
  await authorize();
  const modelName = config.CONVERSATION_AI_MODEL ?? config.LLM_MODEL;
  const maxTokens = Math.min(
    config.CONVERSATION_AI_MAX_TOKENS ?? config.LLM_MAX_TOKENS,
    1536,
  );
  const messages = [
    new SystemMessage(ATTACHMENT_SUMMARY_INSTRUCTIONS),
    new HumanMessage(
      JSON.stringify({
        question,
        document: { fileName: manifest.name, truncated, excerpts },
      }),
    ),
  ];
  await admitConversationModel(
    Math.ceil(Buffer.byteLength(JSON.stringify(messages)) / 3) + maxTokens,
    modelName,
    signal,
  );
  signal.throwIfAborted();
  const model = createChatModel(modelName, maxTokens);
  const answer = await measureConversationStage("model", () =>
    model.invoke(messages, { signal }),
  );
  signal.throwIfAborted();
  await authorize();

  return presentAttachmentSummary(
    completedModelText(answer, 18000),
    manifest.name,
    {
      truncated,
      hasImages: extracted.images.length > 0,
    },
  );
}
