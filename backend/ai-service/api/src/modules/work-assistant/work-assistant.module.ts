import { WorkAssistantAccessService } from "./work-assistant-access.service";
import { WorkAssistantQueryService } from "./work-assistant-query.service";
import { WorkAssistantGenerationService } from "./work-assistant-generation.service";
import { WorkAssistantWorkflowService } from "./work-assistant-workflow.service";
import { Module } from "@nestjs/common";
import { AuthModule } from "../../common/auth/auth.module";
import { SseTransport } from "../../common/sse-transport";
import { WorkAssistantController } from "./work-assistant.controller";
import { WorkContextService } from "./work-context";
import { WorkStore } from "./work-store";

@Module({
  imports: [AuthModule],
  controllers: [WorkAssistantController],
  providers: [
    SseTransport,
    WorkAssistantAccessService,
    WorkAssistantQueryService,
    WorkAssistantGenerationService,
    WorkAssistantWorkflowService,
    WorkStore,
    WorkContextService,
  ],
})
export class WorkAssistantModule {}
