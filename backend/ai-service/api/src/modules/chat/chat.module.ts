import { ChatAdmissionService } from "./chat-admission.service";
import { ChatSseService } from "./chat-sse.service";
import { ChatGenerationService } from "./chat-generation.service";
import { ChatWorkflowService } from "./chat-workflow.service";
import { Module } from "@nestjs/common";
import { AuthModule } from "../../common/auth/auth.module";
import { SseTransport } from "../../common/sse-transport";
import { SourcesModule } from "../sources/sources.module";
import { ChatController } from "./chat.controller";
@Module({
  imports: [AuthModule, SourcesModule],
  controllers: [ChatController],
  providers: [
    SseTransport,
    ChatAdmissionService,
    ChatSseService,
    ChatGenerationService,
    ChatWorkflowService,
  ],
})
export class ChatModule {}
