"use client";

import { useState, type ReactNode } from "react";
import {
  ChevronDown,
  MoreHorizontal,
  NotebookPen,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import type {
  Notebook,
  NotebookActionRunner,
  NotebookActionKey,
} from "../types";
import { Citations } from "./citations";
import { NoteDialog } from "./note-dialog";

export function NotesPanel({
  notebook,
  saving,
  run,
  collapseControl,
}: {
  notebook: Notebook;
  saving: boolean;
  run: NotebookActionRunner;
  pendingAction?: NotebookActionKey | null;
  collapseControl?: ReactNode;
}) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [dialog, setDialog] = useState<{
    type: "create" | "edit" | "delete";
    id?: string;
  } | null>(null);
  const activeNote = notebook.notes.find((note) => note.id === dialog?.id);
  if (dialog?.type === "edit" && (!activeNote || activeNote.hidden))
    setDialog(null);
  const canShowDialog =
    dialog &&
    (dialog.type === "create" ||
      (activeNote && (dialog.type === "delete" || !activeNote.hidden)));

  return (
    <section
      aria-label="Notes"
      className="flex h-full min-h-0 min-w-0 flex-col"
    >
      <header className="flex min-h-16 shrink-0 items-center gap-2 border-b border-border px-4 py-3">
        <span className="grid size-8 place-items-center rounded-control bg-warning-soft text-warning-content">
          <NotebookPen className="size-4" aria-hidden="true" />
        </span>
        <h2 className="text-sm font-semibold">Notes</h2>
        <Badge variant="secondary" className="ml-auto tabular-nums">
          {notebook.notes.length}
        </Badge>
        {collapseControl}
      </header>
      <div className="shrink-0 p-3">
        <Button
          variant="outline"
          className="w-full"
          disabled={saving}
          onClick={() => setDialog({ type: "create" })}
        >
          <Plus aria-hidden="true" />
          New note
        </Button>
      </div>
      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-3 pb-3">
        {!notebook.notes.length && (
          <div className="flex min-h-60 flex-col items-center justify-center gap-3 px-4 py-8 text-center">
            <NotebookPen
              className="size-8 text-warning-content"
              aria-hidden="true"
            />
            <p className="text-sm font-medium">No notes yet</p>
            <p className="max-w-52 text-xs leading-5 text-muted-foreground">
              Create a note or save useful AI answers from your chat.
            </p>
          </div>
        )}
        {notebook.notes.map((note) => (
          <article
            key={note.id}
            className="min-w-0 rounded-control border border-border bg-muted/30 transition-colors hover:bg-card"
          >
            <div className="flex items-start gap-1 p-2">
              <Button
                variant="unstyled"
                className="flex min-w-0 flex-1 items-start gap-2 rounded-control p-1 text-left text-sm font-medium whitespace-normal"
                aria-expanded={expanded === note.id}
                aria-controls={`note-content-${note.id}`}
                onClick={() =>
                  setExpanded(expanded === note.id ? null : note.id)
                }
              >
                <span className="grid size-7 shrink-0 place-items-center rounded-control bg-warning-soft text-warning-content">
                  <NotebookPen className="size-4" aria-hidden="true" />
                </span>
                <ChevronDown
                  className={`mt-0.5 size-4 shrink-0 ${expanded === note.id ? "" : "-rotate-90"}`}
                  aria-hidden="true"
                />
                <span className="min-w-0 [overflow-wrap:anywhere]">
                  {note.title}
                </span>
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Actions for ${note.title}`}
                    disabled={saving}
                  >
                    <MoreHorizontal aria-hidden="true" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    className="w-full"
                    disabled={note.hidden}
                    onClick={() => setDialog({ type: "edit", id: note.id })}
                  >
                    <Pencil className="size-4" aria-hidden="true" />
                    Edit note
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="w-full text-destructive-content data-[highlighted]:bg-destructive-soft data-[highlighted]:text-destructive-content"
                    onClick={() => setDialog({ type: "delete", id: note.id })}
                  >
                    <Trash2 className="size-4" aria-hidden="true" />
                    Delete note
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <div
              id={`note-content-${note.id}`}
              hidden={expanded !== note.id}
              className="min-w-0 border-t border-border px-3 py-3"
            >
              {expanded === note.id &&
                (note.hidden ? (
                  <p className="text-xs text-muted-foreground">
                    This note is hidden because a source is no longer available.
                  </p>
                ) : (
                  <Citations
                    notebookId={notebook.id}
                    items={note.citations}
                    markdown
                    content={note.content}
                  />
                ))}
            </div>
          </article>
        ))}
      </div>
      {canShowDialog && dialog && (
        <NoteDialog
          key={
            dialog.type === "create"
              ? "create"
              : `${dialog.type}:${activeNote?.id}`
          }
          notebookId={notebook.id}
          note={activeNote}
          deleting={dialog.type === "delete"}
          saving={saving}
          run={run}
          onClose={() => setDialog(null)}
        />
      )}
    </section>
  );
}
