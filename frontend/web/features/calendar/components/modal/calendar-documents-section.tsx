"use client";

import { useQueries } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { toast } from "sonner";
import {
  Download,
  FileText,
  Loader2,
  Paperclip,
  Trash2,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { documentsApi } from "@/features/documents/api/documents.api";
import { formatBytes } from "@/features/documents/utils/documents.utils";
import { CalendarDocumentPickerDialog } from "./calendar-document-picker-dialog";

interface CalendarDocumentsSectionProps {
  documentIds: string[];
  onChangeDocumentIds?: (nextIds: string[]) => void;
  isReadOnly?: boolean;
  busy?: boolean;
  hideHeader?: boolean;
}

export function CalendarDocumentsSection({
  documentIds,
  onChangeDocumentIds,
  isReadOnly = false,
  busy = false,
  hideHeader = false,
}: CalendarDocumentsSectionProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [showPickerModal, setShowPickerModal] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Query metadata for each document ID
  const documentQueries = useQueries({
    queries: documentIds.map((id) => ({
      queryKey: ["calendar-document-item", id],
      queryFn: () => documentsApi.getAccessibleItem(id),
      staleTime: 1000 * 60 * 5,
    })),
  });

  if (isReadOnly && documentIds.length === 0) {
    return null;
  }

  const handleUploadFiles = async (files: FileList | null) => {
    const selectedFiles = Array.from(files ?? []);
    if (selectedFiles.length === 0 || !onChangeDocumentIds) return;

    setIsUploading(true);
    try {
      const uploadedIds: string[] = [];
      for (const file of selectedFiles) {
        const item = await documentsApi.uploadFile(file);
        uploadedIds.push(item.id);
      }
      const uniqueNextIds = Array.from(
        new Set([...documentIds, ...uploadedIds]),
      );
      onChangeDocumentIds(uniqueNextIds);
      toast.success(
        uploadedIds.length === 1
          ? "File attached"
          : `${uploadedIds.length} files attached`,
      );
    } catch {
      toast.error("Failed to upload and attach files");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleAttachFromPicker = (selectedItemIds: string[]) => {
    if (!onChangeDocumentIds) return;
    const uniqueNextIds = Array.from(
      new Set([...documentIds, ...selectedItemIds]),
    );
    onChangeDocumentIds(uniqueNextIds);
    toast.success(
      selectedItemIds.length === 1
        ? "File attached"
        : `${selectedItemIds.length} files attached`,
    );
  };

  const handleDownload = async (documentId: string) => {
    try {
      const url = await documentsApi.getDownloadUrl(documentId);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch {
      toast.error("Failed to open document");
    }
  };

  const handleRemove = (documentId: string) => {
    if (!onChangeDocumentIds) return;
    const nextIds = documentIds.filter((id) => id !== documentId);
    onChangeDocumentIds(nextIds);
    toast.success("Attachment removed");
  };

  const isBusy = isUploading || busy;

  return (
    <div className="space-y-2">
      {!hideHeader && (
        <div className="flex items-center justify-between gap-2">
          <h3 className="flex items-center gap-1.5 text-xs font-bold tracking-wide text-slate-500">
            <FileText className="h-3.5 w-3.5" />
            Attachments
            <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500">
              {documentIds.length}
            </span>
          </h3>
          {!isReadOnly && (
            <div className="flex items-center gap-1.5">
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
                onClick={() => setShowPickerModal(true)}
                className="h-7 rounded-lg px-2 text-xs"
              >
                My Files
              </Button>
            </div>
          )}
        </div>
      )}

      {documentIds.length === 0 ? (
        !isReadOnly && (
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-3 py-3 text-center text-xs text-slate-400">
            No files attached.
          </div>
        )
      ) : (
        <div className="space-y-1.5">
          {documentIds.map((id, index) => {
            const query = documentQueries[index];
            const item = query?.data;
            const fileName = item?.name ?? `File ${id.slice(0, 8)}`;
            const fileSize = item?.sizeBytes
              ? formatBytes(item.sizeBytes)
              : null;

            return (
              <div
                key={id}
                className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-2xs"
              >
                <FileText className="h-4 w-4 shrink-0 text-[#0052CC]" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold text-slate-800">
                    {fileName}
                  </p>
                  {fileSize && (
                    <p className="text-[11px] text-slate-400">{fileSize}</p>
                  )}
                </div>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                  onClick={() => void handleDownload(id)}
                  title="Download / View"
                  aria-label="Download"
                >
                  <Download className="h-3.5 w-3.5" />
                </Button>
                {!isReadOnly && (
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    disabled={isBusy}
                    className="h-7 w-7 rounded-lg text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                    onClick={() => handleRemove(id)}
                    title="Remove"
                    aria-label="Remove"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {showPickerModal && (
        <CalendarDocumentPickerDialog
          open={showPickerModal}
          onOpenChange={setShowPickerModal}
          onConfirm={handleAttachFromPicker}
        />
      )}
    </div>
  );
}
