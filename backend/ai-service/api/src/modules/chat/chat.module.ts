import { AiRuntimeModule } from "../../infrastructure/ai-runtime.module";
import { ChatAdmissionService } from "./chat-admission.service";
import { ChatSseService } from "./chat-sse.service";
import { ChatGenerationService } from "./chat-generation.service";
import { ChatWorkflowService } from "./chat-workflow.service";
import { Module } from "@nestjs/common";
import { AuthModule } from "../../common/auth/auth.module";
import { SourcesModule } from "../sources/sources.module";
import { ChatController } from "./chat.controller";
import { ChatService } from "./chat.service";
import { StudioModule } from "../studio/studio.module";
@Module({
  imports: [AiRuntimeModule, AuthModule, SourcesModule, StudioModule],
  controllers: [ChatController],
  providers: [
    ChatService,
    ChatAdmissionService,
    ChatSseService,
    ChatGenerationService,
    ChatWorkflowService,
  ],
  exports: [ChatService],
})
export class ChatModule {}
