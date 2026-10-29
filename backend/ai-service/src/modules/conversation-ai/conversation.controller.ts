import {
  Controller,
  Post,
  Param,
  ParseUUIDPipe,
  Headers,
  UnauthorizedException,
  ServiceUnavailableException,
} from "@nestjs/common";
import { matchesServiceKey } from "../../common/auth/service-key";
import { config } from "../../config/env.config";
import { enqueue } from "../../infrastructure/queue/notebook.queue";
@Controller("internal/conversation-ai")
export class ConversationController {
  @Post(":id")
  async enqueue(
    @Param("id", ParseUUIDPipe) id: string,
    @Headers("x-internal-service-key") key?: string,
  ) {
    const expected = config.AI_COMMUNICATION_SERVICE_KEY;
    if (
      config.AI_ENABLED !== "true" ||
      config.CONVERSATION_AI_ENABLED !== "true" ||
      expected.length < 32
    )
      throw new ServiceUnavailableException();
    if (!matchesServiceKey(key, expected)) throw new UnauthorizedException();
    await enqueue("conversation", id, { requestId: id });
    return { queued: true };
  }
}
