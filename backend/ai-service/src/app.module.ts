import { WorkAssistantModule } from './modules/work-assistant/work-assistant.controller';
import { ConversationController } from "./modules/conversation-ai/conversation.controller";
import { MeetingSummaryController } from "./modules/meeting-summary/meeting-summary.controller";
import { Module } from "@nestjs/common";
import { HealthController } from "./common/health/health.controller";
import { NotebooksModule } from "./modules/notebooks/notebooks.module";
import { SourcesModule } from "./modules/sources/sources.module";
import { ChatModule } from "./modules/chat/chat.module";
import { StudioModule } from "./modules/studio/studio.module";
@Module({
  imports: [WorkAssistantModule, NotebooksModule, SourcesModule, ChatModule, StudioModule],
  controllers: [HealthController, ConversationController, MeetingSummaryController],
})
export class AppModule {}
