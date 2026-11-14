import {
  Body,
  Controller,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  Res,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard, AuthRequest } from "../../common/auth/auth.guard";
import { z } from "zod";
import type { Response } from "express";
import { ChatSseService } from "./chat-sse.service";
import { cancelChatRequest } from "./chat-request";
import { parse } from "../../common/validation";
@Controller("api/ai")
@UseGuards(AuthGuard)
export class ChatController {
  constructor(private readonly transport: ChatSseService) {}
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
    await this.transport.answer(
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
    @Body() body: unknown,
  ) {
    const data = parse(z.object({ notebookId: z.string().uuid() }), body);

    await cancelChatRequest(req.actor.id, data.notebookId, id);

    return { data: {} };
  }
}
