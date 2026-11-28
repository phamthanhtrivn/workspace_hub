import { Module } from "@nestjs/common";
import { AuthModule } from "../../common/auth/auth.module";
import { SourcesController } from "./sources.controller";
import { SourcesService } from "./sources.service";
@Module({
  imports: [AuthModule],
  controllers: [SourcesController],
  providers: [SourcesService],
  exports: [SourcesService],
})
export class SourcesModule {}
