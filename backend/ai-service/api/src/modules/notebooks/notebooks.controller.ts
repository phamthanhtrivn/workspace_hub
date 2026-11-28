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
  Query,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard, AuthRequest } from "../../common/auth/auth.guard";
import { NotebooksService } from "./notebooks.service";
import { parse } from "../../common/validation";
import { notebookListQuery } from "./notebook-list";
import { createNotebookInput, updateNotebookInput } from "./notebook-input";
@Controller("api/ai")
@UseGuards(AuthGuard)
export class NotebooksController {
  constructor(private readonly notebooks: NotebooksService) {}
  @Get("notebooks") async list(
    @Req() req: AuthRequest,
    @Query() query: unknown,
  ) {
    return this.notebooks.list(req.actor, parse(notebookListQuery, query));
  }
  @Post("notebooks") async create(
    @Req() req: AuthRequest,
    @Body() body: unknown,
  ) {
    return {
      data: await this.notebooks.create(
        req.actor,
        parse(createNotebookInput, body),
      ),
    };
  }
  @Get("notebooks/:id") async get(
    @Req() req: AuthRequest,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return { data: await this.notebooks.get(req.actor, id) };
  }
  @Patch("notebooks/:id") async update(
    @Req() req: AuthRequest,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() body: unknown,
  ) {
    return {
      data: await this.notebooks.update(
        req.actor,
        id,
        parse(updateNotebookInput, body),
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
