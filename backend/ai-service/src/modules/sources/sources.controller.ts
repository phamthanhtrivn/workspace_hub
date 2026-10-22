import {
  BadRequestException,
  Body,
  Controller,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard, AuthRequest } from "../../common/auth/auth.guard";
import { z } from "zod";
import { SourcesService } from "./sources.service";
import { ownedNotebook } from "../../common/auth/notebook-access";
import { parse } from "../../common/validation";
import type { Response } from "express";
import {
  checkCapacity,
  checkFile,
  readUpload,
  validateContent,
  withUploadCheck,
} from "./upload-validation";
@Controller("api/ai")
@UseGuards(AuthGuard)
export class SourcesController {
  constructor(private readonly sources: SourcesService) {}
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
  @Post("notebooks/:id/upload-checks") async checkUpload(
    @Req() req: AuthRequest,
    @Param("id", ParseUUIDPipe) id: string,
    @Query("name") name: string,
  ) {
    return withUploadCheck(async () => {
      await ownedNotebook(req.actor, id);
      if (req.headers["content-type"] !== "application/octet-stream")
        throw new BadRequestException(
          "Gửi file dưới dạng application/octet-stream.",
        );
      const size = parse(
        z.coerce.number().int().positive(),
        req.headers["x-file-size"],
      );
      name = parse(z.string().min(1).max(300), name);
      checkFile(name, size);
      const count = parse(
        z.coerce.number().int().min(1).max(5),
        req.headers["x-upload-count"],
      );
      const bytes = parse(
        z.coerce.number().int().min(size),
        req.headers["x-upload-bytes"],
      );
      checkCapacity(await this.sources.sources(id), count, bytes);
      const content = await readUpload(req, size);
      return { data: await validateContent(name, content, id) };
    });
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
    return { data: await this.sources.add(req.actor, id, refs) };
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
      ),
    };
  }
}
