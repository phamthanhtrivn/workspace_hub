import { Injectable } from "@nestjs/common";
import { rows } from "../../infrastructure/database/database";
import { ownedNotebook } from "../../common/auth/notebook-access";
import { SourcesService } from "../sources/sources.service";
import { visibleSnapshot } from "../../common/evidence-policy";
import type { Actor, Source, Snapshot } from "../../common/types";
import { randomUUID } from "node:crypto";
import { deleteSource } from "../../common/delete-source";
import { notebookMessages } from "./notebook-messages";
import type {
  CreateNotebookInput,
  UpdateNotebookInput,
} from "./notebook-input";
import {
  notebookListSql,
  notebookListQuery,
  type NotebookListQuery,
  type NotebookListRow,
} from "./notebook-list";
@Injectable()
export class NotebooksService {
  constructor(private readonly sourcesService: SourcesService) {}
  async list(
    actor: Actor,
    query: NotebookListQuery = notebookListQuery.parse({}),
  ) {
    const [page] = await rows<NotebookListRow>(notebookListSql(query.sort), [
      actor.id,
      query.search,
      query.limit,
      query.page,
    ]);

    return {
      data: page.items,
      meta: {
        page: page.page,
        limit: query.limit,
        total: page.total,
        totalPages: page.total_pages,
        totalNotebooks: page.total_notebooks,
      },
    };
  }
  async create(actor: Actor, input: CreateNotebookInput) {
    return (
      await rows(
        "INSERT INTO notebook_ai.notebooks(id,owner_id,title,description,category,color_theme) VALUES($1,$2,$3,$4,$5,$6) RETURNING *",
        [
          randomUUID(),
          actor.id,
          input.title,
          input.description,
          input.category,
          input.color_theme,
        ],
      )
    )[0];
  }
  async update(actor: Actor, id: string, input: UpdateNotebookInput) {
    await ownedNotebook(actor, id);

    return (
      await rows(
        "UPDATE notebook_ai.notebooks SET title=coalesce($3,title),description=coalesce($4,description),category=coalesce($5,category),color_theme=coalesce($6,color_theme),updated_at=now() WHERE id=$1 AND owner_id=$2 RETURNING *",
        [
          id,
          actor.id,
          input.title,
          input.description,
          input.category,
          input.color_theme,
        ],
      )
    )[0];
  }
  async remove(actor: Actor, id: string) {
    await ownedNotebook(actor, id);
    await deleteSource(id);
  }
  async get(actor: Actor, id: string) {
    const notebook = await ownedNotebook(actor, id);
    const sources = await this.sourcesService.checkedSources(actor, id);
    const [messages, notes] = await Promise.all([
      notebookMessages(id),
      rows(
        "SELECT * FROM notebook_ai.notes WHERE notebook_id=$1 ORDER BY created_at DESC LIMIT 100",
        [id],
      ),
    ]);
    const mask = (item: Record<string, unknown>) =>
      visibleSnapshot(item.sources as Snapshot[], sources)
        ? item
        : {
            ...item,
            content: "",
            citations: [],
            status: "STALE",
            hidden: true,
          };

    return {
      ...notebook,
      sources: sources.map((source: Source & { owner_email?: string }) => {
        const visible = { ...source };
        delete visible.owner_email;

        return visible;
      }),
      messages: messages.reverse().map(mask),
      notes: notes.map(mask),
    };
  }
}
