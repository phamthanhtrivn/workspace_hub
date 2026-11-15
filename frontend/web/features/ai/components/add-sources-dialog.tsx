"use client";

import { useEffect, useState } from "react";
import { Files, FolderOpen, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import dialogLayout from "@/components/ui/responsive-dialog.module.css";
import { NotebookDocumentPicker } from "./notebook-document-picker";
import { SourceUploadDropzone } from "./source-upload-dropzone";
import type { Source } from "../types";
import type { useSourceUpload } from "../hooks/use-source-upload";

import { NOTEBOOK_SOURCE_LIMIT } from "../utils/notebook-source-selection";
export { NOTEBOOK_SOURCE_LIMIT } from "../utils/notebook-source-selection";

export function AddSourcesDialog({
  id,
  sources,
  upload,
  busy,
  refresh,
  onClose,
}: {
  id: string;
  sources: Source[];
  upload: ReturnType<typeof useSourceUpload>;
  busy: boolean;
  refresh: () => Promise<unknown>;
  onClose: () => void;
}) {
  const [pickerBusy, setPickerBusy] = useState(false);
  const locked = busy || upload.uploading || pickerBusy;
  const full = sources.length >= NOTEBOOK_SOURCE_LIMIT;
  useEffect(() => {
    const preventFileNavigation = (event: DragEvent) => {
      if (Array.from(event.dataTransfer?.types ?? []).includes("Files"))
        event.preventDefault();
    };
    window.addEventListener("dragover", preventFileNavigation);
    window.addEventListener("drop", preventFileNavigation);

    return () => {
      window.removeEventListener("dragover", preventFileNavigation);
      window.removeEventListener("drop", preventFileNavigation);
    };
  }, []);

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !locked) onClose();
      }}
    >
      <DialogContent
        className={`${dialogLayout.surface} max-w-2xl rounded-dialog bg-card p-6 text-card-foreground`}
      >
        <DialogHeader className="space-y-1 text-left">
          <DialogTitle className="flex items-center gap-2">
            <Files className="size-5 text-link" aria-hidden="true" />
            Add sources
          </DialogTitle>
          <DialogDescription>
            {sources.length}/{NOTEBOOK_SOURCE_LIMIT} sources added.
          </DialogDescription>
        </DialogHeader>
        <Tabs defaultValue="upload" className={`${dialogLayout.body} mt-5`}>
          <TabsList className="w-full">
            <TabsTrigger value="upload" disabled={locked} className="flex-1">
              <Upload className="size-4" aria-hidden="true" />
              Upload
            </TabsTrigger>
            <TabsTrigger value="documents" disabled={locked} className="flex-1">
              <FolderOpen className="size-4" aria-hidden="true" />
              From Documents
            </TabsTrigger>
          </TabsList>
          <TabsContent value="upload" className="space-y-4 p-1">
            <SourceUploadDropzone
              disabled={locked || full}
              stage={upload.stage}
              onFiles={upload.uploadFiles}
            />
            <p className="text-xs leading-relaxed text-muted-foreground">
              PDFs support up to 100 pages. Each file supports up to 100,000
              tokens and 24 scanned pages or images requiring image analysis.
            </p>
          </TabsContent>
          <TabsContent value="documents" className="p-1">
            <NotebookDocumentPicker
              notebookId={id}
              sources={sources}
              onAdded={refresh}
              disabled={locked || full}
              onPending={setPickerBusy}
            />
          </TabsContent>
        </Tabs>
        {full && (
          <p role="status" className="mt-3 text-sm text-warning-content">
            This notebook has reached its source limit. Remove a source to add
            another.
          </p>
        )}
        {upload.error && (
          <p role="alert" className="mt-3 text-sm text-destructive-content">
            {upload.error}
          </p>
        )}
        {upload.rejections.length > 0 && (
          <div
            role="alert"
            className="mt-3 space-y-1 text-sm text-destructive-content"
          >
            <p className="font-medium">
              Skipped files ({upload.rejections.length})
            </p>
            <ul className="max-h-32 space-y-1 overflow-y-auto break-words">
              {upload.rejections.map((file, index) => (
                <li key={`${index}:${file.name}`}>{file.message}</li>
              ))}
            </ul>
          </div>
        )}
        <DialogFooter className="mt-4">
          <Button variant="outline" disabled={locked} onClick={onClose}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
