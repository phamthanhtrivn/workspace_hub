import { Module } from "@nestjs/common";
import { AuthModule } from "../../common/auth/auth.module";
import { WorkAssistantController } from "./work-assistant.controller";
import { WorkAssistantService } from "./work-assistant.service";
import { WorkContextService } from "./work-context";
import { WorkStore } from "./work-store";

@Module({
  imports: [AuthModule],
  controllers: [WorkAssistantController],
  providers: [WorkAssistantService, WorkStore, WorkContextService],
})
export class WorkAssistantModule {}
