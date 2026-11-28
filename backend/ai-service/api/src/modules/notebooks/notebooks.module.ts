import { Module } from "@nestjs/common";
import { AuthModule } from "../../common/auth/auth.module";
import { SourcesModule } from "../sources/sources.module";
import { NotebooksController } from "./notebooks.controller";
import { NotebooksService } from "./notebooks.service";
@Module({
  imports: [AuthModule, SourcesModule],
  controllers: [NotebooksController],
  providers: [NotebooksService],
  exports: [NotebooksService],
})
export class NotebooksModule {}
