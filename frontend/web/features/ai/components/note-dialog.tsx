"use client";

import { useId, useRef, useState } from "react";
import { FilePenLine, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import dialogLayout from "@/components/ui/responsive-dialog.module.css";
import { notebooksApi } from "../api/notebooks.api";
import type { Notebook, NotebookActionRunner } from "../types";

export function NoteDialog({
  notebookId,
  note,
  deleting = false,
  saving,
  run,
  onClose,
}: {
  notebookId: string;
  note?: Notebook["notes"][number];
  deleting?: boolean;
  saving: boolean;
  run: NotebookActionRunner;
  onClose: () => void;
}) {
  const field = useId();
  const [title, setTitle] = useState(note?.title ?? "");
  const [content, setContent] = useState(note?.content ?? "");
  const [error, setError] = useState("");
  const submitting = useRef(false);
  const label = deleting ? "Delete note" : note ? "Edit note" : "New note";
  const Icon = deleting ? Trash2 : FilePenLine;

  return (
    <Dialog
      open
      modalRole={deleting ? "alertdialog" : "dialog"}
      onOpenChange={(open) => {
        if (!open && !saving && !submitting.current) onClose();
      }}
    >
      <DialogContent
        className={`${dialogLayout.surface} ${deleting ? "max-w-md" : "max-w-3xl"} rounded-dialog bg-card p-6 text-card-foreground`}
      >
        <DialogHeader className="text-left">
          <DialogTitle className="flex items-center gap-2">
            <Icon
              className={`size-5 ${deleting ? "text-destructive-content" : "text-link"}`}
              aria-hidden="true"
            />
            {label}
          </DialogTitle>
          <DialogDescription>
            {deleting
              ? "This note will be permanently removed from this notebook."
              : "Capture your ideas or refine a saved answer. Your note stays in this notebook."}
          </DialogDescription>
        </DialogHeader>
        <form
          className="mt-4 space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (
              saving ||
              submitting.current ||
              (!deleting && (!content.trim() || (note && !title.trim())))
            )
              return;
            submitting.current = true;
            setError("");
            run(
              async () => {
                try {
                  if (deleting && note)
                    await notebooksApi.deleteNote(notebookId, note.id);
                  else
                    await notebooksApi.note(notebookId, {
                      title: title.trim() || "Notes",
                      content,
                      ...(note ? { noteId: note.id } : {}),
                    });
                  onClose();
                } catch (cause) {
                  setError(
                    `Unable to ${deleting ? "delete" : "save"} this note. Please try again.`,
                  );
                  throw cause;
                } finally {
                  submitting.current = false;
                }
              },
              deleting && note
                ? `remove:${note.id}`
                : note
                  ? `note:${note.id}`
                  : "create-note",
            );
          }}
        >
          {deleting ? (
            <p className="rounded-control bg-muted p-3 text-sm font-medium [overflow-wrap:anywhere]">
              {note?.title}
            </p>
          ) : (
            <>
              <div className="space-y-2">
                <label
                  htmlFor={`${field}-title`}
                  className="text-sm font-medium"
                >
                  Title
                  {!note && (
                    <span className="font-normal text-muted-foreground">
                      {" "}
                      (optional)
                    </span>
                  )}
                </label>
                <Input
                  id={`${field}-title`}
                  autoFocus
                  maxLength={200}
                  value={title}
                  disabled={saving}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="Note title"
                />
              </div>
              <div className="space-y-2">
                <label
                  htmlFor={`${field}-content`}
                  className="text-sm font-medium"
                >
                  Note
                </label>
                <Textarea
                  id={`${field}-content`}
                  value={content}
                  disabled={saving}
                  onChange={(event) => setContent(event.target.value)}
                  maxLength={20000}
                  rows={12}
                  className="min-h-40 max-h-[45dvh] resize-y leading-relaxed"
                  placeholder="What would you like to remember?"
                />
                <p className="text-right text-xs tabular-nums text-muted-foreground">
                  {content.length.toLocaleString("en-US")} / 20,000
                </p>
              </div>
            </>
          )}
          {error && (
            <p role="alert" className="text-sm text-destructive-content">
              {error}
            </p>
          )}
          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              autoFocus={deleting}
              disabled={saving}
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant={deleting ? "destructive-soft" : "default"}
              loading={saving}
              disabled={
                !deleting && (!content.trim() || Boolean(note && !title.trim()))
              }
            >
              <Icon aria-hidden="true" />
              {deleting ? "Delete note" : "Save note"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
