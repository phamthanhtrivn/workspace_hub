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
import { WorkAssistantEnabledGuard } from "./work-assistant-enabled.guard";
import { WorkAssistantQueryService } from "./work-assistant-query.service";
import { WorkAssistantWorkflowService } from "./work-assistant-workflow.service";

@Controller("api/ai/work-assistant")
@UseGuards(AuthGuard, WorkAssistantEnabledGuard)
export class WorkAssistantController {
  constructor(
    private readonly queries: WorkAssistantQueryService,
    private readonly workflow: WorkAssistantWorkflowService,
  ) {}

  @Get("overview")
  async overview(@Req() req: AuthRequest, @Query() query: unknown) {
    return this.queries.overview(req.actor, parse(overviewSchema, query));
  }

  @Get("session")
  async session(@Req() req: AuthRequest, @Query() query: unknown) {
    return this.queries.session(req.actor, parse(sessionSchema, query));
  }

  @Get("sessions")
  async sessions(@Req() req: AuthRequest, @Query() query: unknown) {
    return this.queries.sessions(req.actor, parse(sessionsSchema, query));
  }

  @Post("sessions")
  async createSession(@Req() req: AuthRequest, @Body() body: unknown) {
    return this.queries.createSession(
      req.actor,
      parse(createSessionSchema, body),
    );
  }

  @Post("sessions/:id/messages")
  async message(
    @Req() req: AuthRequest,
    @Res() res: Response,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() body: unknown,
  ) {
    await this.workflow.message(req.actor, id, parse(messageSchema, body), res);
  }

  @Post("requests/:id/cancel")
  async cancel(
    @Req() req: AuthRequest,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.workflow.cancel(req.actor, id);
  }
}
