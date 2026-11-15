import {
  Controller,
  Post,
  Param,
  ParseUUIDPipe,
  Headers,
  Body,
} from "@nestjs/common";
import { authorizeCommunicationCaller } from "../../common/auth/service-key";
import { config } from "../../config/env.config";
import { enqueue } from "../../infrastructure/queue/notebook.queue";
import { z } from "zod";
import { parse } from "../../common/validation";
import { resolveChatAttachment } from "../../infrastructure/integrations/document.client";
@Controller("internal/conversation-ai")
export class ConversationController {
  @Post("attachments/resolve")
  async attachmentVersion(
    @Headers("x-internal-service-key") key: string,
    @Body() body: unknown,
  ) {
    authorizeCommunicationCaller(key, {
      enabled: config.CONVERSATION_AI_ENABLED === "true",
    });
    const ref = parse(
      z
        .object({ userId: z.uuid(), s3Key: z.string().min(1).max(1024) })
        .strict(),
      body,
    );
    const manifest = await resolveChatAttachment(
      ref,
      false,
      AbortSignal.timeout(2000),
    );

    return {
      revision: manifest.revision,
      versionId: manifest.versionId,
      sizeBytes: manifest.sizeBytes,
    };
  }
  @Post(":id")
  async enqueue(
    @Param("id", ParseUUIDPipe) id: string,
    @Headers("x-internal-service-key") key?: string,
  ) {
    authorizeCommunicationCaller(key, {
      enabled: config.CONVERSATION_AI_ENABLED === "true",
    });
    await enqueue("conversation", id, { requestId: id });

    return { queued: true };
  }
}
