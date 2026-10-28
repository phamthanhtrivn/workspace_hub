import {
  Body,
  Controller,
  Get,
  HttpException,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from "@nestjs/common";
import type { Response } from "express";
import { z } from "zod";
import { AuthGuard, type AuthRequest } from "../../common/auth/auth.guard";
import { parse } from "../../common/validation";
import { timeZoneSchema } from "./work-time";
import { scopeSchema, querySchema } from "./work-assistant.schemas";
import { WorkAssistantService } from "./work-assistant.service";

@Controller("api/ai/work-assistant")
@UseGuards(AuthGuard)
export class WorkAssistantController {
  constructor(private readonly service: WorkAssistantService) {}
  @Get("overview")
  async overview(@Req() req: AuthRequest, @Query() query: unknown) {
    this.service.enabled();
    const { timeZone, ...scope } = parse(
      scopeSchema.safeExtend({ timeZone: timeZoneSchema.optional() }),
      query,
    );
    return {
      data: await this.service.context.read(
        req.actor,
        scope,
        7,
        undefined,
        timeZone,
      ),
    };
  }
  @Get("session")
  async session(@Req() req: AuthRequest, @Query() query: unknown) {
    this.service.enabled();
    const data = parse(
      querySchema.extend({ sessionId: z.string().uuid().optional() }),
      query,
    );
    await this.service.context.requireScope(req.actor, {
      projectId: data.projectId,
      audience: "mine",
    });
    const session = data.sessionId
      ? await this.service.owned(req.actor, data.sessionId)
      : await this.service.store.session(req.actor, data.projectId);
    if (session.project_id !== (data.projectId ?? null))
      throw new HttpException("Conversation scope does not match", 400);
    const page = await this.service.store.history(session, data.before);
    return {
      data: {
        id: session.id,
        projectId: session.project_id,
        messages: await this.service.visible(req.actor, page.messages),
        nextCursor: page.nextCursor,
      },
    };
  }
  @Get("sessions")
  async sessions(@Req() req: AuthRequest, @Query() query: unknown) {
    this.service.enabled();
    const data = parse(
      querySchema.extend({ before: z.string().min(1).max(512).optional() }),
      query,
    );
    await this.service.context.requireScope(req.actor, {
      projectId: data.projectId,
      audience: "mine",
    });
    const page = await this.service.store.list(
      req.actor,
      data.projectId,
      data.before,
    );
    const ids = [...new Set(page.sessions.flatMap((s) => s.project_ids))];
    const allowed = await this.service.context.authorize(req.actor, ids);
    return {
      data: {
        sessions: page.sessions.map((s) => ({
          id: s.id,
          projectId: s.project_id,
          updatedAt: s.updated_at,
          title: s.project_ids.some((id) => !allowed.has(id))
            ? "Cuộc trò chuyện trước đây"
            : s.content?.replace(/\s+/g, " ").trim().slice(0, 100) ||
              "Cuộc trò chuyện mới",
        })),
        nextCursor: page.nextCursor,
      },
    };
  }
  @Post("sessions")
  async createSession(@Req() req: AuthRequest, @Body() body: unknown) {
    this.service.enabled();
    const { projectId } = parse(
      z.object({ projectId: z.string().uuid().optional() }).strict(),
      body,
    );
    await this.service.context.requireScope(req.actor, {
      projectId,
      audience: "mine",
    });
    const session = await this.service.store.session(
      req.actor,
      projectId,
      true,
    );
    return {
      data: {
        id: session.id,
        projectId: session.project_id,
        messages: [],
        nextCursor: null,
      },
    };
  }
  @Post("sessions/:id/messages")
  async message(
    @Req() req: AuthRequest,
    @Res() res: Response,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() body: unknown,
  ) {
    this.service.enabled();
    const data = parse(
      z
        .object({
          question: z.string().trim().min(1).max(4000),
          requestId: z.string().uuid(),
          audience: z.enum(["mine", "project"]).default("mine"),
          timeZone: timeZoneSchema.optional(),
        })
        .strict(),
      body,
    );
    const session = await this.service.owned(req.actor, id);
    if (!session.project_id && data.audience === "project")
      throw new HttpException("Project scope required", 400);
    await this.service.answer(
      req,
      res,
      session,
      data.question,
      data.requestId,
      data.audience,
      data.timeZone,
    );
  }
  @Post("requests/:id/cancel")
  async cancel(
    @Req() req: AuthRequest,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    this.service.enabled();
    await this.service.store.cancel(req.actor, id);
    return { data: { canceled: true } };
  }
}
