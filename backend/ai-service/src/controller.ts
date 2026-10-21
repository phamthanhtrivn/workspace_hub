import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
  Res,
  UseGuards,
} from "@nestjs/common";
import type { Response } from "express";
import { z } from "zod";
import { AuthGuard, AuthRequest } from "./auth";
import { Notebooks } from "./notebooks";
import { Chat } from "./chat";

const title = z.string().trim().min(1).max(200);
function parse<T>(schema: z.ZodType<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) throw new BadRequestException("Dữ liệu không hợp lệ");
  return result.data;
}
@Controller("api/ai")
@UseGuards(AuthGuard)
export class NotebookController {
  constructor(
    private readonly notebooks: Notebooks,
    private readonly chat: Chat,
  ) {}
  @Get("notebooks") async list(@Req() req: AuthRequest) {
    return { data: await this.notebooks.list(req.actor) };
  }
  @Post("notebooks") async create(
    @Req() req: AuthRequest,
    @Body() body: unknown,
  ) {
    return {
      data: await this.notebooks.create(
        req.actor,
        parse(z.object({ title }), body).title,
      ),
    };
  }
  @Get("notebooks/:id") async get(
    @Req() req: AuthRequest,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return { data: await this.notebooks.get(req.actor, id) };
  }
  @Patch("notebooks/:id") async rename(
    @Req() req: AuthRequest,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() body: unknown,
  ) {
    return {
      data: await this.notebooks.rename(
        req.actor,
        id,
        parse(z.object({ title }), body).title,
      ),
    };
  }
  @Delete("notebooks/:id") async remove(
    @Req() req: AuthRequest,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    await this.notebooks.remove(req.actor, id);
    return { data: {} };
  }
  @Post("notebooks/:id/sources") async add(
    @Req() req: AuthRequest,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() body: unknown,
  ) {
    const { refs } = parse(
      z.object({
        refs: z
          .array(
            z.object({
              documentId: z.string().uuid(),
              versionId: z.string().uuid().optional(),
            }),
          )
          .min(1)
          .max(5),
      }),
      body,
    );
    return { data: await this.notebooks.add(req.actor, id, refs) };
  }
  @Post("notebooks/:id/sources/:sourceId/:action") async source(
    @Req() req: AuthRequest,
    @Param("id", ParseUUIDPipe) id: string,
    @Param("sourceId", ParseUUIDPipe) sourceId: string,
    @Param("action") action: string,
  ) {
    return {
      data: await this.notebooks.sourceAction(
        req.actor,
        id,
        sourceId,
        parse(z.enum(["retry", "remove", "preview"]), action),
      ),
    };
  }
  @Post("notebooks/:id/messages") async message(
    @Req() req: AuthRequest,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() body: unknown,
    @Res() res: Response,
  ) {
    const data = parse(
      z.object({
        question: z.string().trim().min(1).max(4000),
        sourceIds: z.array(z.string().uuid()).min(1).max(5),
        requestId: z.string().uuid(),
      }),
      body,
    );
    await this.chat.answer(
      req.actor,
      id,
      data.question,
      data.sourceIds,
      data.requestId,
      res,
    );
  }
  @Post("requests/:id/cancel") async cancel(
    @Req() req: AuthRequest,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return { data: await this.chat.cancel(req.actor, id) };
  }
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
    return { data: await this.notebooks.note(req.actor, id, data) };
  }
  @Delete("notebooks/:id/notes/:noteId") async deleteNote(
    @Req() req: AuthRequest,
    @Param("id", ParseUUIDPipe) id: string,
    @Param("noteId", ParseUUIDPipe) noteId: string,
  ) {
    await this.notebooks.deleteNote(req.actor, id, noteId);
    return { data: {} };
  }
  @Post("notebooks/:id/artifacts") async artifact(
    @Req() req: AuthRequest,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() body: unknown,
  ) {
    const { kind } = parse(
      z.object({ kind: z.enum(["OVERVIEW", "SUMMARY"]) }),
      body,
    );
    return { data: await this.notebooks.artifact(req.actor, id, kind) };
  }
}
