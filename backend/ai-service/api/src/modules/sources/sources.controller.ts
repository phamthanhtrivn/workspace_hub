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
import { SourcesService } from "./sources.service";
import { parse } from "../../common/validation";
import type { Response } from "express";
@Controller("api/ai")
@UseGuards(AuthGuard)
export class SourcesController {
  constructor(private readonly sources: SourcesService) {}
  @Post("notebooks/:id/uploads/confirm") async confirmUploads(
    @Req() req: AuthRequest,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() body: unknown,
  ) {
    const upload = parse(
      z.object({ snapshotIds: z.array(z.string().uuid()).min(1).max(5) }),
      body,
    );

    return {
      data: await this.sources.confirmUploads(
        req.actor,
        id,
        upload.snapshotIds,
      ),
    };
  }
  @Post("notebooks/:id/uploads") async beginUpload(
    @Req() req: AuthRequest,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() body: unknown,
  ) {
    const upload = parse(
      z.object({
        operationId: z.string().uuid(),
        name: z.string().min(1).max(255),
        mimeType: z.string().min(1).max(100),
        sizeBytes: z.number().int().positive(),
      }),
      body,
    );

    return {
      data: await this.sources.beginUpload(
        req.actor,
        id,
        upload.operationId,
        upload.name,
        upload.mimeType,
        upload.sizeBytes,
      ),
    };
  }
  @Post("notebooks/:id/sources/:sourceId/images/:imageId") async visual(
    @Req() req: AuthRequest,
    @Param("id", ParseUUIDPipe) id: string,
    @Param("sourceId", ParseUUIDPipe) sourceId: string,
    @Param("imageId") imageId: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    res.set("Cache-Control", "no-store");

    return {
      data: await this.sources.visual(req.actor, id, sourceId, imageId),
    };
  }
  @Post("notebooks/:id/sources") async add(
    @Req() req: AuthRequest,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() body: unknown,
  ) {
    const { refs, operationId } = parse(
      z.object({
        operationId: z.string().uuid().optional(),
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

    return { data: await this.sources.add(req.actor, id, refs, operationId) };
  }
  @Post("notebooks/:id/sources/:sourceId/:action") async source(
    @Req() req: AuthRequest,
    @Param("id", ParseUUIDPipe) id: string,
    @Param("sourceId", ParseUUIDPipe) sourceId: string,
    @Param("action") action: string,
  ) {
    return {
      data: await this.sources.sourceAction(
        req.actor,
        id,
        sourceId,
        parse(z.enum(["retry", "remove", "preview"]), action),
        req.headers.authorization,
      ),
    };
  }
}
