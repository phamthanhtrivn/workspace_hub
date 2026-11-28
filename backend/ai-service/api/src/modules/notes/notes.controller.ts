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
import { z } from "zod";
import { AuthGuard, AuthRequest } from "../../common/auth/auth.guard";
import { parse, title } from "../../common/validation";
import { NotesService } from "./notes.service";

const content = z
  .string()
  .max(20000)
  .refine((value) => Boolean(value.trim()));
const noteInput = z.union([
  z.object({ title, content }).strict(),
  z.object({ title, content, noteId: z.string().uuid() }).strict(),
  z.object({ title, messageId: z.string().uuid() }).strict(),
]);

@Controller("api/ai")
@UseGuards(AuthGuard)
export class NotesController {
  constructor(private readonly notes: NotesService) {}

  @Post("notebooks/:id/notes") async save(
    @Req() req: AuthRequest,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() body: unknown,
  ) {
    const input = parse(noteInput, body);
    const data =
      "noteId" in input
        ? await this.notes.update(req.actor, id, input)
        : "messageId" in input
          ? await this.notes.saveAnswer(req.actor, id, input)
          : await this.notes.create(req.actor, id, input);

    return { data };
  }

  @Delete("notebooks/:id/notes/:noteId") async remove(
    @Req() req: AuthRequest,
    @Param("id", ParseUUIDPipe) id: string,
    @Param("noteId", ParseUUIDPipe) noteId: string,
  ) {
    await this.notes.remove(req.actor, id, noteId);

    return { data: {} };
  }
}
