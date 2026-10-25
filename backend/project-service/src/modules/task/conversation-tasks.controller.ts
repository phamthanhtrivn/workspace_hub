import {
  Body,
  Controller,
  Headers,
  Post,
  ServiceUnavailableException,
  UnauthorizedException,
} from "@nestjs/common";
import { IsIn, IsOptional, IsUUID } from "class-validator";
import { timingSafeEqual } from "node:crypto";
import { Public } from "../../common/decorators/public.decorator";
import {
  ConversationTasksService,
  ConversationTaskScope,
} from "./conversation-tasks.service";

export class ConversationTasksDto {
  @IsUUID()
  userId!: string;

  @IsIn(["today", "overdue", "open"])
  scope!: ConversationTaskScope;

  @IsOptional()
  @IsUUID()
  projectId?: string;
}

@Controller("internal/conversation-tasks")
export class ConversationTasksController {
  constructor(private readonly tasks: ConversationTasksService) {}

  @Public()
  @Post()
  async list(
    @Headers("x-internal-service-key") key: string,
    @Body() body: ConversationTasksDto,
  ) {
    const expected = process.env.AI_PROJECT_SERVICE_KEY || "";
    if (expected.length < 32)
      throw new ServiceUnavailableException(
        "Conversation task access is not configured",
      );
    if (
      typeof key !== "string" ||
      Buffer.byteLength(key) !== Buffer.byteLength(expected) ||
      !timingSafeEqual(Buffer.from(key), Buffer.from(expected))
    )
      throw new UnauthorizedException();
    return {
      data: await this.tasks.list(body.userId, body.scope, body.projectId),
    };
  }
}
