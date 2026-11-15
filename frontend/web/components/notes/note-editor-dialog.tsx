"use client";

import { useId, useRef, useState, type ReactNode } from "react";
import { FileText } from "lucide-react";
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
import { FIELD_FOCUS_CONTAINER_CLASS_NAME } from "@/components/ui/field-focus";
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
          className={`${dialogLayout.surface} z-[130] w-[calc(100%-2rem)] max-w-3xl overflow-hidden rounded-panel bg-card p-0 text-card-foreground`}
        >
          <DialogHeader className="border-b border-border p-4 text-left">
            <DialogTitle className="flex items-center gap-2">
              {editing && (
                <FileText
                  className="size-5 text-warning-content"
                  aria-hidden="true"
                />
              )}
              {editing ? "Edit Note" : "Create Note"}
            </DialogTitle>
            {description && (
              <DialogDescription>{description}</DialogDescription>
            )}
          </DialogHeader>
          <form
            className={`${dialogLayout.body} space-y-5 p-6`}
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
            <div>
              <label
                htmlFor={`${field}-title`}
                className="mb-1 block text-sm font-medium text-foreground"
              >
                Note Title
              </label>
              <div
                className={`${FIELD_FOCUS_CONTAINER_CLASS_NAME} rounded-control border border-input bg-card p-0.5`}
              >
                <Input
                  id={`${field}-title`}
                  unstyled
                  focusMode="container"
                  required
                  autoFocus
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  disabled={locked}
                  maxLength={maxTitleLength}
                  placeholder="Enter note title..."
                  className="block w-full rounded-[calc(var(--radius-control)-2px)] bg-transparent px-3.5 py-1.5"
                />
              </div>
            </div>
            <div>
              <label
                id={`${field}-label`}
                htmlFor={`${field}-content`}
                className="mb-1 block text-sm font-medium text-foreground"
              >
                Note Content
              </label>
              <MarkdownNoteEditor
                id={`${field}-content`}
                aria-labelledby={`${field}-label`}
                value={content}
                setValue={setContent}
                disabled={locked}
                maxLength={maxContentLength}
                renderPreview={renderPreview}
                placeholder="Enter note content..."
                minHeightClassName={editing ? "min-h-[150px]" : "min-h-[160px]"}
              />
              {maxContentLength && (
                <p
                  className={`mt-2 text-right text-xs tabular-nums ${tooLong ? "text-destructive-content" : "text-muted-foreground"}`}
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
            <div className={`pt-2 ${editing ? "flex justify-end gap-3" : ""}`}>
              {editing && (
                <Button
                  type="button"
                  variant="secondary"
                  disabled={locked}
                  onClick={requestClose}
                >
                  Cancel
                </Button>
              )}
              <Button
                type="submit"
                variant="warning"
                className={editing ? "" : "w-full"}
                loading={locked}
                disabled={!title.trim() || !content.trim() || tooLong}
              >
                {editing ? "Save Changes" : "Create Note"}
              </Button>
            </div>
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
