"use client";

import { useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { toast } from "sonner";
import {
  Check,
  Download,
  FileText,
  FolderOpen,
  Loader2,
  Paperclip,
  Trash2,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { documentsApi } from "@/features/documents/api/documents.api";
import { DocumentItemType } from "@/features/documents/types/documents.enums";
import type { DocumentItem } from "@/features/documents/types/documents.types";
import { formatBytes } from "@/features/documents/utils/documents.utils";
import {
  TaskDocumentAttachmentSource,
  type Task,
} from "@/features/project/types/project";
import { useProjectDocuments } from "@/features/project/hooks/use-projects";
import {
  useAttachTaskDocuments,
  useDetachTaskDocument,
  useTaskDocuments,
} from "@/features/project/hooks/use-tasks";

type PickerMode = "MY_FILES" | "PROJECT_DOCUMENT";

interface TaskDocumentsSectionProps {
  task: Task;
  isReadOnly: boolean;
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
        return "You do not have permission to upload into Project Documents. Ask a project admin for document edit access, or attach from My Files/Project Documents instead.";
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

  const handleUploadFiles = async (files: FileList | null) => {
    const selectedFiles = Array.from(files ?? []);
    if (selectedFiles.length === 0) return;

    setIsUploading(true);
    try {
      const uploaded = [];
      for (const file of selectedFiles) {
        uploaded.push(await documentsApi.uploadFile(file, null, task.projectId));
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
        getTaskDocumentErrorMessage(error, "Failed to attach files"),
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
    } catch {
      toast.error("Failed to open document");
    }
  };

  const handleRemove = async (attachmentId: string) => {
    try {
      await detachDocument.mutateAsync(attachmentId);
      toast.success("Attachment removed");
    } catch (error) {
      toast.error(
        getTaskDocumentErrorMessage(error, "Failed to remove attachment"),
      );
    }
  };

  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-slate-500">
          <Paperclip className="h-3.5 w-3.5" />
          Attachments
          <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500">
            {attachments.length}
          </span>
        </h3>
        {!isReadOnly && (
          <div className="flex flex-wrap justify-end gap-1.5">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={(event) => void handleUploadFiles(event.target.files)}
            />
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={isBusy}
              onClick={() => fileInputRef.current?.click()}
              className="h-7 rounded-lg px-2 text-xs"
            >
              {isUploading ? (
                <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
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
              className="h-7 rounded-lg px-2 text-xs"
            >
              My Files
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={isBusy}
              onClick={() => setPickerMode("PROJECT_DOCUMENT")}
              className="h-7 rounded-lg px-2 text-xs"
            >
              Project
            </Button>
          </div>
        )}
      </div>

      {documentsQuery.isLoading ? (
        <div className="flex items-center gap-2 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-xs text-slate-500">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Loading attachments...
        </div>
      ) : attachments.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50/60 px-3 py-3 text-xs text-slate-500">
          No documents attached.
        </div>
      ) : (
        <div className="space-y-1.5">
          {attachments.map((attachment) => (
            <div
              key={attachment.id}
              className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-2.5 py-2"
            >
              <FileText className="h-4 w-4 shrink-0 text-[#0052CC]" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-slate-800">
                  {attachment.name}
                </p>
                <p className="text-[11px] text-slate-500">
                  {formatBytes(attachment.sizeBytes)} -{" "}
                  {sourceLabel(attachment.source)}
                </p>
              </div>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-7 w-7 rounded-lg"
                onClick={() => void handleDownload(attachment.documentItemId)}
                title="Download"
                aria-label="Download"
              >
                <Download className="h-3.5 w-3.5" />
              </Button>
              {!isReadOnly && (
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  disabled={detachDocument.isPending}
                  className="h-7 w-7 rounded-lg text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                  onClick={() => void handleRemove(attachment.id)}
                  title="Remove"
                  aria-label="Remove"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      <TaskDocumentPickerDialog
        task={task}
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
  task: Task;
  mode: PickerMode | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function TaskDocumentPickerDialog({
  task,
  mode,
  open,
  onOpenChange,
}: TaskDocumentPickerDialogProps) {
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const projectDocumentsQuery = useProjectDocuments(task.projectId);
  const attachDocuments = useAttachTaskDocuments(task.projectId, task.id);
  const rootFolderId = projectDocumentsQuery.data?.folderId;

  const query = useQuery({
    queryKey: [
      "task-document-picker",
      mode,
      task.projectId,
      rootFolderId,
      search,
    ],
    queryFn: async () => {
      if (mode === "PROJECT_DOCUMENT") {
        if (!rootFolderId) return [];
        const response = await documentsApi.getDocuments({
          folderId: rootFolderId,
          page: 1,
          limit: 50,
          search: search.trim() || undefined,
        });
        return response.data;
      }

      const response = await documentsApi.getDocuments({
        page: 1,
        limit: 50,
        search: search.trim() || undefined,
      });
      return response.data;
    },
    enabled: open && Boolean(mode) && (mode !== "PROJECT_DOCUMENT" || Boolean(rootFolderId)),
  });

  const files = useMemo(
    () => (query.data ?? []).filter((item) => item.type === DocumentItemType.FILE),
    [query.data],
  );

  const toggleSelected = (item: DocumentItem) => {
    setSelectedIds((current) =>
      current.includes(item.id)
        ? current.filter((id) => id !== item.id)
        : [...current, item.id],
    );
  };

  const handleAttach = async () => {
    if (!mode || selectedIds.length === 0) return;
    try {
      await attachDocuments.mutateAsync({
        documentItemIds: selectedIds,
        source:
          mode === "MY_FILES"
            ? TaskDocumentAttachmentSource.MY_FILES
            : TaskDocumentAttachmentSource.PROJECT_DOCUMENT,
      });
      toast.success(
        selectedIds.length === 1
          ? "Document attached"
          : `${selectedIds.length} documents attached`,
      );
      setSelectedIds([]);
      setSearch("");
      onOpenChange(false);
    } catch (error) {
      toast.error(
        getTaskDocumentErrorMessage(error, "Failed to attach documents"),
      );
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          setSelectedIds([]);
          setSearch("");
        }
        onOpenChange(nextOpen);
      }}
    >
      <DialogContent className="max-w-lg gap-0 overflow-hidden rounded-2xl border-slate-200 bg-white p-0">
        <DialogHeader className="border-b border-slate-100 px-5 py-4 text-left">
          <DialogTitle className="flex items-center gap-2 text-base font-bold text-slate-900">
            <FolderOpen className="h-4 w-4 text-[#0052CC]" />
            {mode === "PROJECT_DOCUMENT"
              ? "Attach project documents"
              : "Attach from My Files"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 p-5">
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search files"
            className="h-9 rounded-lg text-sm"
          />

          <div className="max-h-72 overflow-y-auto rounded-lg border border-slate-200">
            {query.isLoading ? (
              <div className="flex items-center gap-2 px-3 py-6 text-sm text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading files...
              </div>
            ) : files.length === 0 ? (
              <div className="px-3 py-6 text-sm text-slate-500">
                No files found.
              </div>
            ) : (
              files.map((item) => {
                const selected = selectedIds.includes(item.id);
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => toggleSelected(item)}
                    className={[
                      "flex w-full items-center gap-2 border-b border-slate-100 px-3 py-2 text-left last:border-b-0",
                      selected ? "bg-blue-50" : "bg-white hover:bg-slate-50",
                    ].join(" ")}
                  >
                    <span
                      className={[
                        "flex h-4 w-4 shrink-0 items-center justify-center rounded border text-[10px]",
                        selected
                          ? "border-[#0052CC] bg-[#0052CC] text-white"
                          : "border-slate-300 bg-white text-transparent",
                      ].join(" ")}
                    >
                      <Check className="h-3 w-3" />
                    </span>
                    <FileText className="h-4 w-4 shrink-0 text-slate-500" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-slate-800">
                        {item.name}
                      </span>
                      <span className="block text-xs text-slate-500">
                        {formatBytes(item.sizeBytes)}
                      </span>
                    </span>
                  </button>
                );
              })
            )}
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="h-8 rounded-lg px-3 text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={selectedIds.length === 0 || attachDocuments.isPending}
              onClick={() => void handleAttach()}
              className="h-8 rounded-lg bg-[#0052CC] px-3 text-xs text-white hover:bg-[#0747A6]"
            >
              {attachDocuments.isPending && (
                <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
              )}
              Attach {selectedIds.length || ""}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
