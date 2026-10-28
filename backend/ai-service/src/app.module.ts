import { WorkAssistantModule } from "./modules/work-assistant/work-assistant.module";
import { ConversationModule } from "./modules/conversation-ai/conversation.module";
import { MeetingSummaryModule } from "./modules/meeting-summary/meeting-summary.module";
import { Module } from "@nestjs/common";
import { HealthController } from "./common/health/health.controller";
import { NotebooksModule } from "./modules/notebooks/notebooks.module";
import { SourcesModule } from "./modules/sources/sources.module";
import { ChatModule } from "./modules/chat/chat.module";
import { StudioModule } from "./modules/studio/studio.module";
@Module({
  imports: [
    WorkAssistantModule,
    ConversationModule,
    MeetingSummaryModule,
    NotebooksModule,
    SourcesModule,
    ChatModule,
    StudioModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
