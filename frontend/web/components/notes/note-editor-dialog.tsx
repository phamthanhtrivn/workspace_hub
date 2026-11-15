"use client";

import { useId, useRef, useState, type ReactNode } from "react";
import { FilePenLine, Save } from "lucide-react";
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
import dialogLayout from "@/components/ui/responsive-dialog.module.css";
import { MarkdownNoteEditor } from "./markdown-note-editor";
import {
  NOTE_DIALOG_MESSAGES,
  type NoteDraft,
  type NoteSaveResult,
} from "./note.constants";

export interface NoteEditorDialogProps {
  initialTitle?: string;
  initialContent?: string;
  editing?: boolean;
  busy?: boolean;
  maxTitleLength?: number;
  maxContentLength?: number;
  description?: string;
  renderPreview: (content: string) => ReactNode;
  onSave: (draft: NoteDraft) => NoteSaveResult | Promise<NoteSaveResult>;
  onClose: () => void;
}

export function NoteEditorDialog({
  initialTitle = "",
  initialContent = "",
  editing = false,
  busy = false,
  maxTitleLength,
  maxContentLength,
  description,
  renderPreview,
  onSave,
  onClose,
}: NoteEditorDialogProps) {
  const field = useId();
  const [title, setTitle] = useState(initialTitle);
  const [content, setContent] = useState(initialContent);
  const [saving, setSaving] = useState(false);
  const [discardOpen, setDiscardOpen] = useState(false);
  const [error, setError] = useState("");
  const submitting = useRef(false);
  const locked = saving || busy;
  const dirty = title !== initialTitle || content !== initialContent;
  const tooLong = Boolean(
    (maxTitleLength && title.length > maxTitleLength) ||
    (maxContentLength && content.length > maxContentLength),
  );
  const requestClose = () => {
    if (locked || submitting.current) return;
    if (dirty) setDiscardOpen(true);
    else onClose();
  };

  return (
    <>
      <Dialog
        open
        onOpenChange={(open) => {
          if (!open) requestClose();
        }}
      >
        <DialogContent
          overlayClassName="z-[120]"
          className={`${dialogLayout.surface} z-[130] max-w-3xl rounded-dialog bg-card p-6 text-card-foreground`}
        >
          <DialogHeader className="text-left">
            <DialogTitle className="flex items-center gap-2">
              <FilePenLine className="size-5 text-link" aria-hidden="true" />
              {editing ? "Edit note" : "New note"}
            </DialogTitle>
            {description && (
              <DialogDescription>{description}</DialogDescription>
            )}
          </DialogHeader>
          <form
            className="mt-4 space-y-4"
            onSubmit={async (event) => {
              event.preventDefault();
              if (
                submitting.current ||
                locked ||
                !title.trim() ||
                !content.trim() ||
                tooLong
              )
                return;
              submitting.current = true;
              setSaving(true);
              setError("");
              try {
                const result = await onSave({ title: title.trim(), content });
                if (result === false) setError(NOTE_DIALOG_MESSAGES.saveFailed);
                else onClose();
              } catch {
                setError(NOTE_DIALOG_MESSAGES.saveFailed);
              } finally {
                submitting.current = false;
                setSaving(false);
              }
            }}
          >
            <div className="space-y-2">
              <label htmlFor={`${field}-title`} className="text-sm font-medium">
                Title
              </label>
              <Input
                id={`${field}-title`}
                required
                autoFocus
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                disabled={locked}
                maxLength={maxTitleLength}
                placeholder="Note title"
              />
            </div>
            <div className="space-y-2">
              <label
                id={`${field}-label`}
                htmlFor={`${field}-content`}
                className="text-sm font-medium"
              >
                Note
              </label>
              <MarkdownNoteEditor
                id={`${field}-content`}
                aria-labelledby={`${field}-label`}
                value={content}
                setValue={setContent}
                disabled={locked}
                maxLength={maxContentLength}
                renderPreview={renderPreview}
                placeholder="What would you like to remember?"
                minHeightClassName="min-h-48"
              />
              {maxContentLength && (
                <p
                  className={`text-right text-xs tabular-nums ${tooLong ? "text-destructive-content" : "text-muted-foreground"}`}
                >
                  {content.length.toLocaleString("en-US")} /{" "}
                  {maxContentLength.toLocaleString("en-US")}
                </p>
              )}
            </div>
            {error && (
              <p role="alert" className="text-sm text-destructive-content">
                {error}
              </p>
            )}
            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={locked}
                onClick={requestClose}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                loading={locked}
                disabled={!title.trim() || !content.trim() || tooLong}
              >
                <Save aria-hidden="true" />
                {editing ? "Save changes" : "Save note"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      {discardOpen && (
        <Dialog
          open
          modalRole="alertdialog"
          onOpenChange={(open) => {
            if (!open) setDiscardOpen(false);
          }}
        >
          <DialogContent
            overlayClassName="z-[140]"
            className={`${dialogLayout.surface} z-[150] max-w-md rounded-dialog bg-card p-6 text-card-foreground`}
          >
            <DialogHeader className="text-left">
              <DialogTitle>{NOTE_DIALOG_MESSAGES.discardTitle}</DialogTitle>
              <DialogDescription>
                {NOTE_DIALOG_MESSAGES.discardDescription}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="mt-4 gap-2">
              <Button
                variant="outline"
                autoFocus
                onClick={() => setDiscardOpen(false)}
              >
                {NOTE_DIALOG_MESSAGES.keepEditing}
              </Button>
              <Button variant="destructive-soft" onClick={onClose}>
                {NOTE_DIALOG_MESSAGES.discard}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
