"use client";

import { useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { BookOpen, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import dialogLayout from "@/components/ui/responsive-dialog.module.css";
import { store } from "@/store/store";
import { notebooksApi } from "../api/notebooks.api";
import {
  NOTEBOOK_TITLE_LIMIT,
  notebookKeys,
  type NotebookDialogAction,
} from "../types/notebook-list";

export function NotebookDialog({
  userId,
  action,
  onClose,
  onDeleted,
}: {
  userId: string;
  action: NotebookDialogAction;
  onClose: () => void;
  onDeleted?: () => void;
}) {
  const inputId = useId();
  const [title, setTitle] = useState(
    action.type === "create" ? "" : action.notebook.title,
  );
  const submitting = useRef(false);
  const client = useQueryClient();
  const router = useRouter();
  const deleting = action.type === "delete";
  const Icon = deleting ? Trash2 : action.type === "create" ? BookOpen : Pencil;
  const label = deleting
    ? "Delete notebook"
    : action.type === "create"
      ? "New notebook"
      : "Rename notebook";
  const mutation = useMutation({
    retry: false,
    mutationFn: async () => {
      if (store.getState().auth.userId !== userId)
        throw new Error("The account changed.");
      if (action.type === "create") return notebooksApi.create(title.trim());
      if (action.type === "rename")
        await notebooksApi.rename(action.notebook.id, title.trim());
      else await notebooksApi.remove(action.notebook.id);

      return null;
    },
    onSuccess: (created) => {
      if (store.getState().auth.userId !== userId) return;
      void client.invalidateQueries({ queryKey: notebookKeys.lists(userId) });
      if (action.type !== "create") {
        const detailKey = ["notebook-ai", userId, action.notebook.id];
        if (deleting) client.removeQueries({ queryKey: detailKey });
        else void client.invalidateQueries({ queryKey: detailKey });
      }
      toast.success(
        deleting
          ? "Notebook deleted."
          : action.type === "create"
            ? "Notebook created."
            : "Notebook renamed.",
      );
      onClose();
      if (deleting) onDeleted?.();
      if (created) router.push(`/ai/notebooks/${created.id}`);
    },
  });
  const error = mutation.isError
    ? `Unable to ${deleting ? "delete" : action.type === "create" ? "create" : "rename"} this notebook. Please try again.`
    : "";

  return (
    <Dialog
      open
      modalRole={deleting ? "alertdialog" : "dialog"}
      onOpenChange={(open) => {
        if (!open && !submitting.current) onClose();
      }}
    >
      <DialogContent
        className={`${dialogLayout.surface} max-w-md rounded-dialog bg-card p-6 text-card-foreground`}
      >
        <DialogHeader className="flex flex-row items-start gap-3 space-y-0 text-left">
          <span
            className={`grid size-10 shrink-0 place-items-center rounded-control ${deleting ? "bg-destructive-soft text-destructive-content" : "bg-primary-soft text-primary-soft-foreground"}`}
          >
            <Icon className="size-5" aria-hidden="true" />
          </span>
          <div className="min-w-0 space-y-1">
            <DialogTitle>{label}</DialogTitle>
            <DialogDescription>
              {deleting
                ? "The notebook, conversation history and saved notes will be removed. Original files in Documents will be kept."
                : "Keep your documents, questions and notes together in a private notebook."}
            </DialogDescription>
          </div>
        </DialogHeader>
        <form
          className="mt-5 space-y-5"
          onSubmit={(event) => {
            event.preventDefault();
            if (submitting.current || (!deleting && !title.trim())) return;
            submitting.current = true;
            void mutation
              .mutateAsync()
              .catch(() => {})
              .finally(() => {
                submitting.current = false;
              });
          }}
        >
          {deleting ? (
            <p className="break-words rounded-control bg-muted p-3 text-sm font-medium [overflow-wrap:anywhere]">
              {action.type === "delete" && action.notebook.title}
            </p>
          ) : (
            <div className="space-y-2">
              <label htmlFor={inputId} className="text-sm font-medium">
                Notebook name
              </label>
              <Input
                id={inputId}
                autoFocus
                value={title}
                onChange={(event) => {
                  setTitle(event.target.value);
                  mutation.reset();
                }}
                disabled={mutation.isPending}
                maxLength={NOTEBOOK_TITLE_LIMIT}
                placeholder="e.g. Thesis research"
                aria-invalid={mutation.isError || undefined}
                aria-describedby={error ? `${inputId}-error` : undefined}
              />
            </div>
          )}
          {error && (
            <p
              id={`${inputId}-error`}
              role="alert"
              className="text-sm text-destructive-content"
            >
              {error}
            </p>
          )}
          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              autoFocus={deleting}
              disabled={mutation.isPending}
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant={deleting ? "destructive-soft" : "default"}
              loading={mutation.isPending}
              disabled={!deleting && !title.trim()}
            >
              <Icon aria-hidden="true" />
              {deleting
                ? "Delete notebook"
                : action.type === "create"
                  ? "Create notebook"
                  : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
