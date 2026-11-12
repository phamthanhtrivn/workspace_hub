import {
  Controller,
  Post,
  Param,
  ParseUUIDPipe,
  Headers,
} from "@nestjs/common";
import { authorizeCommunicationCaller } from "../../common/auth/service-key";
import { config } from "../../config/env.config";
import { enqueue } from "../../infrastructure/queue/notebook.queue";
@Controller("internal/conversation-ai")
export class ConversationController {
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
