import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { rows } from "../../infrastructure/database/database";
import { ownedNotebook } from "../../common/auth/notebook-access";
import { visibleSnapshot } from "../../common/evidence-policy";
import type { Actor, Citation, Snapshot } from "../../common/types";
import { SourcesService } from "../sources/sources.service";
import { notebookAnswer } from "../notebooks/notebook-messages";

type NoteInput = { title: string; content: string };

@Injectable()
export class NotesService {
  constructor(private readonly sources: SourcesService) {}

  async create(actor: Actor, notebookId: string, input: NoteInput) {
    await ownedNotebook(actor, notebookId);

    return this.insert(notebookId, input);
  }

  async saveAnswer(
    actor: Actor,
    notebookId: string,
    input: { title: string; messageId: string },
  ) {
    await ownedNotebook(actor, notebookId);
    const message = await notebookAnswer(notebookId, input.messageId);
    if (!message) throw new NotFoundException();
    if (
      !visibleSnapshot(
        message.sources,
        await this.sources.checkedSources(actor, notebookId),
      )
    )
      throw new ForbiddenException();

    return this.insert(notebookId, {
      title: input.title,
      content: message.content,
      sources: message.sources,
      citations: message.citations,
      kind: "SAVED_AI",
    });
  }

  async update(
    actor: Actor,
    notebookId: string,
    input: NoteInput & { noteId: string },
  ) {
    await ownedNotebook(actor, notebookId);
    const [note] = await rows<{ sources: Snapshot[] }>(
      "SELECT sources FROM notebook_ai.notes WHERE id=$1 AND notebook_id=$2",
      [input.noteId, notebookId],
    );
    if (
      !note ||
      !visibleSnapshot(
        note.sources,
        await this.sources.checkedSources(actor, notebookId),
      )
    )
      throw new NotFoundException();
    const [updated] = await rows(
      "UPDATE notebook_ai.notes SET title=$3,content=$4,updated_at=now() WHERE id=$1 AND notebook_id=$2 RETURNING *",
      [input.noteId, notebookId, input.title, input.content],
    );
    if (!updated) throw new NotFoundException();

    return updated;
  }

  async remove(actor: Actor, notebookId: string, noteId: string) {
    await ownedNotebook(actor, notebookId);
    await rows("DELETE FROM notebook_ai.notes WHERE id=$1 AND notebook_id=$2", [
      noteId,
      notebookId,
    ]);
  }

  private async insert(
    notebookId: string,
    input: NoteInput & {
      sources?: Snapshot[];
      citations?: Citation[];
      kind?: "SAVED_AI";
    },
  ) {
    const [note] = await rows(
      "INSERT INTO notebook_ai.notes(id,notebook_id,title,content,sources,citations,kind) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *",
      [
        randomUUID(),
        notebookId,
        input.title,
        input.content,
        JSON.stringify(input.sources ?? []),
        JSON.stringify(input.citations ?? []),
        input.kind ?? "MANUAL",
      ],
    );

    return note;
  }
}
