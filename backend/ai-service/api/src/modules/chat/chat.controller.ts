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
import { ChatService } from "./chat.service";
import { parse } from "../../common/validation";
@Controller("api/ai")
@UseGuards(AuthGuard)
export class ChatController {
  constructor(private readonly chat: ChatService) {}
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
}
