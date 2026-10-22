import {
  Body,
  Controller,
  Delete,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard, AuthRequest } from "../../common/auth/auth.guard";
import { z } from "zod";
import { StudioService } from "./studio.service";
import { parse, title } from "../../common/validation";
@Controller("api/ai")
@UseGuards(AuthGuard)
export class StudioController {
  constructor(private readonly studio: StudioService) {}
  @Post("notebooks/:id/notes") async note(
    @Req() req: AuthRequest,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() body: unknown,
  ) {
    const data = parse(
      z
        .object({
          title,
          content: z.string().max(20000).optional(),
          messageId: z.string().uuid().optional(),
          noteId: z.string().uuid().optional(),
        })
        .refine((v) => Boolean(v.content?.trim() || v.messageId)),
      body,
    );
    return { data: await this.studio.note(req.actor, id, data) };
  }
  @Delete("notebooks/:id/notes/:noteId") async deleteNote(
    @Req() req: AuthRequest,
    @Param("id", ParseUUIDPipe) id: string,
    @Param("noteId", ParseUUIDPipe) noteId: string,
  ) {
    await this.studio.deleteNote(req.actor, id, noteId);
    return { data: {} };
  }
  @Post("notebooks/:id/artifacts") async artifact(
    @Req() req: AuthRequest,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() body: unknown,
  ) {
    const { kind, sourceIds } = parse(
      z.object({
        kind: z.enum(["OVERVIEW", "SUMMARY"]),
        sourceIds: z.array(z.string().uuid()).min(1).max(5).optional(),
      }),
      body,
    );
    return { data: await this.studio.artifact(req.actor, id, kind, sourceIds) };
  }
}
