import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard, AuthRequest } from "../../common/auth/auth.guard";
import { z } from "zod";
import { NotebooksService } from "./notebooks.service";
import { parse, title } from "../../common/validation";
@Controller("api/ai")
@UseGuards(AuthGuard)
export class NotebooksController {
  constructor(private readonly notebooks: NotebooksService) {}
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
}
