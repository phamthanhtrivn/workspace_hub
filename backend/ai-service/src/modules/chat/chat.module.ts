import { Module } from "@nestjs/common";
import { AuthModule } from "../../common/auth/auth.module";
import { SourcesModule } from "../sources/sources.module";
import { ChatController } from "./chat.controller";
import { ChatService } from "./chat.service";
import { StudioModule } from "../studio/studio.module";
@Module({
  imports: [AuthModule, SourcesModule, StudioModule],
  controllers: [ChatController],
  providers: [ChatService],
  exports: [ChatService],
})
export class ChatModule {}
