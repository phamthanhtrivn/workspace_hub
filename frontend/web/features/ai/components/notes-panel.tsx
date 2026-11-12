"use client";

import { Details, DetailsSummary } from "@/components/ui/details";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { notebooksApi } from "../api/notebooks.api";
import type {
  Notebook,
  NotebookActionKey,
  NotebookActionRunner,
} from "../types";
import { Citations } from "./citations";

type Props = {
  notebook: Notebook;
  saving: boolean;
  run: NotebookActionRunner;
  pendingAction?: NotebookActionKey | null;
};
export function NotesPanel({ notebook, saving, pendingAction, run }: Props) {
  const [content, setContent] = useState("");
  const [title, setTitle] = useState("");

  return (
    <section aria-label="Notes" className="h-full space-y-5 overflow-y-auto">
      <h2 className="font-semibold">Notes</h2>
      <form
        className="space-y-2 border-t pt-4"
        onSubmit={(event) => {
          event.preventDefault();
          run(async () => {
            await notebooksApi.note(notebook.id, {
              title: title.trim() || "Notes",
              content,
            });
            setContent("");
            setTitle("");
          }, "create-note");
        }}
      >
        <h3 className="text-sm font-semibold">New note</h3>
        <Input
          aria-label="Note title"
          placeholder="Title"
          maxLength={200}
          value={title}
          onChange={(event) => setTitle(event.target.value)}
        />
        <Textarea
          aria-label="Note content"
          placeholder="What would you like to remember?"
          maxLength={20000}
          value={content}
          onChange={(event) => setContent(event.target.value)}
        />
        <Button
          loading={saving && pendingAction === "create-note"}
          size="sm"
          disabled={saving || !content.trim()}
        >
          Save note
        </Button>
      </form>
      {notebook.notes.map((note) => (
        <Details key={note.id} className="rounded-lg border p-3">
          <DetailsSummary className="cursor-pointer break-words text-sm font-medium">
            {note.title}
          </DetailsSummary>
          {note.hidden ? (
            <p className="mt-2 text-xs">
              This note is hidden because a source is no longer available.
            </p>
          ) : (
            <NoteEditor
              key={`${note.id}-${note.content}`}
              note={note}
              notebookId={notebook.id}
              run={run}
              saving={saving}
              pendingAction={pendingAction}
            />
          )}
          <Button
            size="sm"
            variant="ghost"
            className="mt-2 text-destructive"
            loading={saving && pendingAction === `remove:${note.id}`}
            onClick={() =>
              run(
                () => notebooksApi.deleteNote(notebook.id, note.id),
                `remove:${note.id}`,
              )
            }
          >
            Delete note
          </Button>
        </Details>
      ))}
    </section>
  );
}

function NoteEditor({
  note,
  notebookId,
  run,
  saving,
  pendingAction,
}: {
  note: Notebook["notes"][number];
  notebookId: string;
  run: Props["run"];
  saving: boolean;
  pendingAction?: NotebookActionKey | null;
}) {
  const [title, setTitle] = useState(note.title);
  const [content, setContent] = useState(note.content);

  return (
    <form
      className="mt-3 space-y-2"
      onSubmit={(event) => {
        event.preventDefault();
        run(
          () =>
            notebooksApi.note(notebookId, { title, content, noteId: note.id }),
          `note:${note.id}`,
        );
      }}
    >
      <Input
        aria-label="Edit note title"
        maxLength={200}
        value={title}
        onChange={(event) => setTitle(event.target.value)}
      />
      <Textarea
        aria-label="Edit note content"
        maxLength={20000}
        rows={8}
        value={content}
        onChange={(event) => setContent(event.target.value)}
      />
      <Citations notebookId={notebookId} items={note.citations} />
      <Button
        size="sm"
        variant="outline"
        loading={saving && pendingAction === `note:${note.id}`}
        disabled={saving || !content.trim() || !title.trim()}
      >
        Save changes
      </Button>
    </form>
  );
}
