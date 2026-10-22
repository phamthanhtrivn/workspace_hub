import { Module } from "@nestjs/common";
import { AuthModule } from "../../common/auth/auth.module";
import { SourcesModule } from "../sources/sources.module";
import { StudioController } from "./studio.controller";
import { StudioService } from "./studio.service";
@Module({
  imports: [AuthModule, SourcesModule],
  controllers: [StudioController],
  providers: [StudioService],
  exports: [StudioService],
})
export class StudioModule {}
