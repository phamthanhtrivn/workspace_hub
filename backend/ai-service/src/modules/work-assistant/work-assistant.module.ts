import { AiRuntimeModule } from "../../infrastructure/ai-runtime.module";
import { WorkAssistantAccessService } from "./work-assistant-access.service";
import { WorkAssistantQueryService } from "./work-assistant-query.service";
import { WorkAssistantGenerationService } from "./work-assistant-generation.service";
import { WorkAssistantWorkflowService } from "./work-assistant-workflow.service";
import { WorkAssistantSseService } from "./work-assistant-sse.service";
import { Module } from "@nestjs/common";
import { AuthModule } from "../../common/auth/auth.module";
import { WorkAssistantController } from "./work-assistant.controller";
import { WorkAssistantService } from "./work-assistant.service";
import { WorkContextService } from "./work-context";
import { WorkStore } from "./work-store";

@Module({
  imports: [AiRuntimeModule, AuthModule],
  controllers: [WorkAssistantController],
  providers: [
    WorkAssistantService,
    WorkAssistantAccessService,
    WorkAssistantQueryService,
    WorkAssistantGenerationService,
    WorkAssistantWorkflowService,
    WorkAssistantSseService,
    WorkStore,
    WorkContextService,
  ],
})
export class WorkAssistantModule {}
