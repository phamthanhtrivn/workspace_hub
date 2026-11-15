"use client";

import { useRef, useState } from "react";
import { Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import dialogLayout from "@/components/ui/responsive-dialog.module.css";
import { NoteEditorDialog } from "@/components/notes/note-editor-dialog";
import { notebooksApi } from "../api/notebooks.api";
import type { Notebook, NotebookActionRunner } from "../types";
import { Citations } from "./citations";

interface Props {
  notebookId: string;
  note?: Notebook["notes"][number];
  deleting?: boolean;
  saving: boolean;
  run: NotebookActionRunner;
  onClose: () => void;
}

export function NoteDialog(props: Props) {
  const { notebookId, note, saving, run, onClose } = props;
  if (props.deleting) return <DeleteNoteDialog {...props} />;

  return (
    <NoteEditorDialog
      editing={Boolean(note)}
      initialTitle={note?.title}
      initialContent={note?.content}
      maxTitleLength={200}
      maxContentLength={20000}
      busy={saving}
      onClose={onClose}
      renderPreview={(content) => (
        <Citations
          notebookId={notebookId}
          items={note?.citations ?? []}
          markdown
          content={content}
        />
      )}
      onSave={(draft) =>
        run(
          () =>
            notebooksApi.note(notebookId, {
              ...draft,
              ...(note ? { noteId: note.id } : {}),
            }),
          note ? `note:${note.id}` : "create-note",
        )
      }
    />
  );
}

function DeleteNoteDialog({ notebookId, note, saving, run, onClose }: Props) {
  const [error, setError] = useState("");
  const submitting = useRef(false);

  return (
    <Dialog
      open
      modalRole="alertdialog"
      onOpenChange={(open) => {
        if (!open && !saving && !submitting.current) onClose();
      }}
    >
      <DialogContent
        className={`${dialogLayout.surface} max-w-md rounded-dialog bg-card p-6 text-card-foreground`}
      >
        <DialogHeader className="text-left">
          <DialogTitle className="flex items-center gap-2">
            <Trash2
              className="size-5 text-destructive-content"
              aria-hidden="true"
            />
            Delete note
          </DialogTitle>
          <DialogDescription>
            This note will be permanently removed from this notebook.
          </DialogDescription>
        </DialogHeader>
        <p className="mt-4 rounded-control bg-muted p-3 text-sm font-medium [overflow-wrap:anywhere]">
          {note?.title}
        </p>
        {error && (
          <p role="alert" className="text-sm text-destructive-content">
            {error}
          </p>
        )}
        <DialogFooter className="mt-4 gap-2">
          <Button
            autoFocus
            variant="outline"
            disabled={saving}
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            variant="destructive-soft"
            loading={saving}
            onClick={async () => {
              if (!note || submitting.current || saving) return;
              submitting.current = true;
              setError("");
              try {
                if (
                  await run(
                    () => notebooksApi.deleteNote(notebookId, note.id),
                    `remove:${note.id}`,
                  )
                )
                  onClose();
                else setError("Unable to delete this note. Please try again.");
              } finally {
                submitting.current = false;
              }
            }}
          >
            <Trash2 aria-hidden="true" />
            Delete note
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
