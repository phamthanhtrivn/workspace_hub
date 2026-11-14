import { Module } from "@nestjs/common";
import { AuthModule } from "../../common/auth/auth.module";
import { SourcesModule } from "../sources/sources.module";
import { NotesController } from "./notes.controller";
import { NotesService } from "./notes.service";

@Module({
  imports: [AuthModule, SourcesModule],
  controllers: [NotesController],
  providers: [NotesService],
})
export class NotesModule {}
