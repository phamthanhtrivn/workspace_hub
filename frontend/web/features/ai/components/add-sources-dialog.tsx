"use client";

import { useRef, useState } from "react";
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
import type { Source } from "../types";
import type { useSourceUpload } from "../hooks/use-source-upload";

export const NOTEBOOK_SOURCE_LIMIT = 5;

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
  const input = useRef<HTMLInputElement>(null);
  const [pickerBusy, setPickerBusy] = useState(false);
  const locked = busy || upload.uploading || pickerBusy;
  const full = sources.length >= NOTEBOOK_SOURCE_LIMIT;

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
            Upload files or choose documents you can access. {sources.length}/
            {NOTEBOOK_SOURCE_LIMIT} sources added.
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
            <div className="flex flex-col items-center gap-3 rounded-panel border border-dashed border-border px-5 py-8 text-center">
              <Upload className="size-8 text-link" aria-hidden="true" />
              <p className="font-medium">Add documents to your notebook</p>
              <p className="max-w-prose text-sm text-muted-foreground">
                PDF, DOCX, TXT, MD, PNG, JPEG and WebP. Up to 20 MiB per file
                and 50 MiB per notebook.
              </p>
              <Button
                loading={upload.uploading}
                disabled={locked || full}
                onClick={() => input.current?.click()}
              >
                <Upload aria-hidden="true" />
                {upload.stage === "CHECKING"
                  ? "Checking files..."
                  : upload.stage === "ADDING"
                    ? "Adding sources..."
                    : upload.uploading
                      ? "Uploading..."
                      : "Choose files"}
              </Button>
              <input
                ref={input}
                type="file"
                hidden
                multiple
                accept=".pdf,.docx,.txt,.md,.png,.jpg,.jpeg,.webp"
                onChange={(event) => {
                  void upload.uploadFiles(Array.from(event.target.files || []));
                  event.target.value = "";
                }}
              />
            </div>
            <p className="text-xs leading-relaxed text-muted-foreground">
              PDFs support up to 100 pages. Each file supports up to 100,000
              tokens and 24 scanned pages or images requiring image analysis.
            </p>
          </TabsContent>
          <TabsContent value="documents" className="p-1">
            <NotebookDocumentPicker
              notebookId={id}
              addedIds={sources.map((source) => source.document_id)}
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
        <DialogFooter className="mt-4">
          <Button variant="outline" disabled={locked} onClick={onClose}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
