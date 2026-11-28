"use client";

import { useRef, useState } from "react";
import axios from "axios";
import { toast } from "sonner";
import { Download, FolderOpen, Paperclip, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DocumentFilePicker } from "@/features/documents/components/picker/document-file-picker";
import { DocumentIcon } from "@/features/documents/components/common/document-icon";
import { DocumentItemType } from "@/features/documents/types/documents.enums";
import { fileCopyApi } from "@/features/documents/api/file-copy.api";
import { documentsApi } from "@/features/documents/api/documents.api";
import { formatBytes } from "@/features/documents/utils/documents.utils";
import {
  TaskDocumentAttachmentSource,
  type Task,
} from "@/features/project/types/project";
import {
  useAttachTaskDocuments,
  useDetachTaskDocument,
  useTaskDocuments,
} from "@/features/project/hooks/use-tasks";
import { Spinner } from "@/components/ui/spinner";
import {
  getActionErrorMessage,
  PERMISSION_REASON,
} from "@/lib/permission-feedback";

type PickerMode = "MY_FILES" | "PROJECT_DOCUMENT";

interface TaskDocumentsSectionProps {
  task: Task;
  isReadOnly: boolean;
  canEditDocuments: boolean;
  readOnlyReason: string;
}

function sourceLabel(source: TaskDocumentAttachmentSource) {
  if (source === TaskDocumentAttachmentSource.DEVICE_UPLOAD) return "Upload";
  if (source === TaskDocumentAttachmentSource.MY_FILES) return "My Files";

  return "Project";
}

function getTaskDocumentErrorMessage(
  error: unknown,
  fallbackMessage: string,
): string {
  if (axios.isAxiosError(error)) {
    const responseMessage = error.response?.data?.message;
    if (typeof responseMessage === "string" && responseMessage.trim()) {
      if (
        error.response?.status === 409 &&
        responseMessage.includes("already exists")
      ) {
        return `${responseMessage}. Rename the file or attach the existing Project Document instead.`;
      }
      if (
        error.response?.status === 403 &&
        responseMessage.includes("not allowed to edit")
      ) {
        return "You do not have permission to upload into Project Documents. Ask a project admin for document edit access.";
      }

      return responseMessage;
    }
  }

  if (error instanceof Error && error.message) return error.message;

  return fallbackMessage;
}

export default function TaskDocumentsSection({
  task,
  isReadOnly,
  canEditDocuments,
  readOnlyReason,
}: TaskDocumentsSectionProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [pickerMode, setPickerMode] = useState<PickerMode | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const documentsQuery = useTaskDocuments(task.id);
  const attachDocuments = useAttachTaskDocuments(task.projectId, task.id);
  const detachDocument = useDetachTaskDocument(task.projectId, task.id);

  const attachments = documentsQuery.data ?? task.documentAttachments;
  const isBusy =
    isUploading || attachDocuments.isPending || detachDocument.isPending;
  const uploadReason = isReadOnly
    ? readOnlyReason
    : !canEditDocuments
      ? PERMISSION_REASON.projectDocuments
      : undefined;

  const handleUploadFiles = async (files: FileList | null) => {
    const selectedFiles = Array.from(files ?? []);
    if (selectedFiles.length === 0) return;
    if (uploadReason) {
      toast.error(
        `You can't upload files to Project Documents. ${uploadReason}`,
      );

      return;
    }

    setIsUploading(true);
    try {
      const uploaded = [];
      for (const file of selectedFiles) {
        uploaded.push(
          await documentsApi.uploadFile(file, null, task.projectId),
        );
      }
      await attachDocuments.mutateAsync({
        documentItemIds: uploaded.map((item) => item.id),
        source: TaskDocumentAttachmentSource.DEVICE_UPLOAD,
      });
      toast.success(
        uploaded.length === 1
          ? "File attached"
          : `${uploaded.length} files attached`,
      );
    } catch (error) {
      toast.error(
        getActionErrorMessage(
          error,
          getTaskDocumentErrorMessage(error, "Failed to attach files"),
        ),
      );
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDownload = async (documentItemId: string) => {
    try {
      const url = await documentsApi.getDownloadUrl(documentItemId);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (permissionError) {
      toast.error(
        getActionErrorMessage(permissionError, "Failed to open document"),
      );
    }
  };

  const handleRemove = async (attachmentId: string) => {
    if (isReadOnly) {
      toast.error(`You can't remove task attachments. ${readOnlyReason}`);

      return;
    }
    try {
      await detachDocument.mutateAsync(attachmentId);
      toast.success("Attachment removed");
    } catch (error) {
      toast.error(
        getActionErrorMessage(
          error,
          getTaskDocumentErrorMessage(error, "Failed to remove attachment"),
        ),
      );
    }
  };

  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <Paperclip className="h-3.5 w-3.5" />
          Attachments
          <span className="rounded-full bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
            {attachments.length}
          </span>
        </h3>
        {
          <div className="flex flex-wrap justify-end gap-1.5">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              disabled={isBusy || Boolean(uploadReason)}
              className="hidden"
              onChange={(event) => void handleUploadFiles(event.target.files)}
            />
            <Button
              aria-busy={isUploading || undefined}
              type="button"
              size="sm"
              variant="outline"
              disabled={isBusy}
              disabledReason={uploadReason}
              onClick={() => fileInputRef.current?.click()}
              className="h-7 rounded-control px-2 text-xs"
            >
              {isUploading ? (
                <Spinner size={14} className="mr-1" />
              ) : (
                <Upload className="mr-1 h-3.5 w-3.5" />
              )}
              Upload
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={isBusy}
              onClick={() => setPickerMode("MY_FILES")}
              disabledReason={isReadOnly ? readOnlyReason : undefined}
              className="h-7 rounded-control px-2 text-xs"
            >
              My Files
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={isBusy}
              onClick={() => setPickerMode("PROJECT_DOCUMENT")}
              disabledReason={isReadOnly ? readOnlyReason : undefined}
              className="h-7 rounded-control px-2 text-xs"
            >
              Project
            </Button>
          </div>
        }
      </div>

      {documentsQuery.isLoading ? (
        <div
          role="status"
          className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-xs text-muted-foreground"
        >
          <Spinner size={14} />
          Loading attachments...
        </div>
      ) : attachments.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-background px-3 py-3 text-xs text-muted-foreground">
          No documents attached.
        </div>
      ) : (
        <div className="space-y-1.5">
          {attachments.map((attachment) => (
            <div
              key={attachment.id}
              className="flex items-center gap-2 rounded-lg border border-border bg-card px-2.5 py-2"
            >
              <DocumentIcon
                item={{
                  type: DocumentItemType.FILE,
                  name: attachment.name,
                  mimeType: attachment.mimeType,
                }}
                iconSize={18}
                className="size-8 shrink-0 rounded-control"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-foreground">
                  {attachment.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatBytes(attachment.sizeBytes)} -{" "}
                  {sourceLabel(attachment.source)}
                </p>
              </div>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-7 w-7 rounded-control"
                onClick={() => void handleDownload(attachment.documentItemId)}
                title="Download"
                aria-label="Download"
              >
                <Download className="h-3.5 w-3.5" />
              </Button>
              {
                <Button
                  loading={
                    detachDocument.isPending &&
                    detachDocument.variables === attachment.id
                  }
                  type="button"
                  size="icon"
                  variant="ghost"
                  disabled={detachDocument.isPending}
                  disabledReason={isReadOnly ? readOnlyReason : undefined}
                  className="h-7 w-7 rounded-control text-destructive-content hover:bg-destructive-soft hover:text-destructive-content"
                  onClick={() => void handleRemove(attachment.id)}
                  title="Remove"
                  aria-label="Remove"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              }
            </div>
          ))}
        </div>
      )}

      <TaskDocumentPickerDialog
        canEditDocuments={canEditDocuments}
        task={task}
        isReadOnly={isReadOnly}
        readOnlyReason={readOnlyReason}
        mode={pickerMode}
        open={Boolean(pickerMode)}
        onOpenChange={(open) => {
          if (!open) setPickerMode(null);
        }}
      />
    </section>
  );
}

interface TaskDocumentPickerDialogProps {
  mode: PickerMode | null;
  canEditDocuments: boolean;
  task: Task;
  isReadOnly: boolean;
  readOnlyReason: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function TaskDocumentPickerDialog({
  mode,
  task,
  isReadOnly,
  canEditDocuments,
  readOnlyReason,
  open,
  onOpenChange,
}: TaskDocumentPickerDialogProps) {
  const [pending, setPending] = useState(false);
  const attachDocuments = useAttachTaskDocuments(task.projectId, task.id);
  if (!open) return null;

  return (
    <Dialog
      open
      onOpenChange={(next) => {
        if (!pending) onOpenChange(next);
      }}
    >
      <DialogContent
        className="max-w-2xl gap-0 overflow-hidden rounded-dialog bg-card p-0"
        showCloseButton={!pending}
      >
        <DialogHeader className="border-b border-border">
          <DialogTitle className="flex items-center gap-2">
            <FolderOpen className="size-4" aria-hidden="true" />
            {mode === "PROJECT_DOCUMENT" ? "Project documents" : "Attach files"}
          </DialogTitle>
        </DialogHeader>
        <div className="min-h-0 overflow-y-auto p-4">
          <DocumentFilePicker
            key={task.id + ":" + mode}
            context={"task:" + task.id}
            projectId={mode === "PROJECT_DOCUMENT" ? task.projectId : undefined}
            disabled={isReadOnly}
            onPending={setPending}
            isAdded={(file) =>
              task.documentAttachments.some(
                (attachment) => attachment.documentItemId === file.id,
              )
            }
            validate={(files) =>
              !canEditDocuments &&
              files.some((file) => file.projectId !== task.projectId)
                ? "Document edit access is required to copy files into this project."
                : files.some((file) => file.sizeBytes > 10 * 1024 * 1024)
                  ? "Project files support up to 10 MiB."
                  : ""
            }
            onConfirm={async (files, operationId, signal, assertActor) => {
              if (isReadOnly) throw new Error(readOnlyReason);
              assertActor();
              const external = files.filter(
                (file) => file.projectId !== task.projectId,
              );
              const imported = external.length
                ? await fileCopyApi.project(
                    task.projectId,
                    external,
                    operationId,
                    signal,
                  )
                : [];
              assertActor();
              await attachDocuments.mutateAsync({
                documentItemIds: [
                  ...files
                    .filter((file) => file.projectId === task.projectId)
                    .map((file) => file.id),
                  ...imported.map((file) => file.id),
                ],
                source: TaskDocumentAttachmentSource.PROJECT_DOCUMENT,
              });
              assertActor();
              toast.success("Files attached");
              onOpenChange(false);
            }}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
