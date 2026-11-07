"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { UploadCloud } from "lucide-react";
import type { DocumentUploadEntry } from "../../types/upload.types";
import { UploadFileRow } from "../common/upload-file-row";

interface VersionUploaderProps {
  uploads: DocumentUploadEntry[];
  isUploading: boolean;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onFileChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onTriggerFileSelect: () => void;
  onRetry: (id: string) => void;
}

export function VersionUploader({
  uploads, isUploading, fileInputRef, onFileChange, onTriggerFileSelect, onRetry,
}: VersionUploaderProps) {
  return (
    <div className="mb-6 space-y-3">
      <input type="file" ref={fileInputRef} onChange={onFileChange} disabled={isUploading} className="hidden" />
      <Button variant="unstyled" type="button" disabled={isUploading}
        onClick={onTriggerFileSelect}
        className="group flex w-full flex-col items-center justify-center rounded-panel border-2 border-dashed border-border p-6 text-left transition-colors duration-200 hover:border-info-outline hover:bg-background motion-reduce:transition-none"
      >
        <div className="mb-3 rounded-panel bg-background p-3 text-muted-foreground transition-colors duration-200 group-hover:bg-info-soft group-hover:text-info-content motion-reduce:transition-none">
          <UploadCloud size={24} aria-hidden="true" />
        </div>
        <span className="text-sm font-semibold text-foreground">
          {isUploading ? "Uploading version…" : uploads.length ? "Upload another version" : "Upload new version"}
        </span>
        <span className="mt-1 text-xs font-semibold text-muted-foreground">
          Old versions will be kept safely in history
        </span>
      </Button>
      {uploads.length > 0 && <div className="overflow-hidden rounded-panel border border-border bg-background">
        <p role="status" className="border-b border-border px-4 py-2 text-xs font-medium text-muted-foreground">
          {isUploading ? "Uploading new version" : "Version upload finished"}
        </p>
        <ol aria-label="Version uploads">
          {uploads.map(upload => <UploadFileRow key={upload.id} upload={upload} onRetry={onRetry} retryDisabled={isUploading} />)}
        </ol>
      </div>}
    </div>
  );
}
