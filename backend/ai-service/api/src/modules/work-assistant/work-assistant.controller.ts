import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from "@nestjs/common";
import type { Response } from "express";
import { AuthGuard, type AuthRequest } from "../../common/auth/auth.guard";
import { parse } from "../../common/validation";
import {
  overviewSchema,
  sessionSchema,
  sessionsSchema,
  createSessionSchema,
  messageSchema,
} from "./work-assistant.schemas";
import { WorkAssistantService } from "./work-assistant.service";

@Controller("api/ai/work-assistant")
@UseGuards(AuthGuard)
export class WorkAssistantController {
  constructor(private readonly service: WorkAssistantService) {}

  @Get("overview")
  async overview(@Req() req: AuthRequest, @Query() query: unknown) {
    return this.service.overview(req.actor, parse(overviewSchema, query));
  }

  @Get("session")
  async session(@Req() req: AuthRequest, @Query() query: unknown) {
    return this.service.session(req.actor, parse(sessionSchema, query));
  }

  @Get("sessions")
  async sessions(@Req() req: AuthRequest, @Query() query: unknown) {
    return this.service.sessions(req.actor, parse(sessionsSchema, query));
  }

  @Post("sessions")
  async createSession(@Req() req: AuthRequest, @Body() body: unknown) {
    const { projectId } = parse(createSessionSchema, body);
    return this.service.createSession(req.actor, projectId);
  }

  @Post("sessions/:id/messages")
  async message(
    @Req() req: AuthRequest,
    @Res() res: Response,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() body: unknown,
  ) {
    await this.service.message(req.actor, id, parse(messageSchema, body), res);
  }

  @Post("requests/:id/cancel")
  async cancel(
    @Req() req: AuthRequest,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.service.cancel(req.actor, id);
  }
}
