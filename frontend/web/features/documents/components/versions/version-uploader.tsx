"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { UploadCloud } from "lucide-react";
import { VERSION_MESSAGES } from "../../types/document-version.constants";

interface VersionUploaderProps {
  isUploading: boolean;
  disabled?: boolean;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onFileChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onTriggerFileSelect: () => void;
  onFilesDropped: (files: File[]) => void;
}

export function VersionUploader({
  isUploading,
  disabled = false,
  fileInputRef,
  onFileChange,
  onTriggerFileSelect,
  onFilesDropped,
}: VersionUploaderProps) {
  const [isDragging, setIsDragging] = React.useState(false);
  const depth = React.useRef(0);
  const unavailable = disabled || isUploading;
  const resetDrag = () => {
    depth.current = 0;
    setIsDragging(false);
  };

  return (
    <div
      role="region"
      aria-label="Version upload drop zone"
      className="mb-6 space-y-3"
      onDragEnter={(event) => {
        event.preventDefault();
        event.stopPropagation();
        if (
          unavailable ||
          !Array.from(event.dataTransfer.types).includes("Files")
        )
          return;
        depth.current += 1;
        setIsDragging(true);
      }}
      onDragOver={(event) => {
        event.preventDefault();
        event.stopPropagation();
        event.dataTransfer.dropEffect = unavailable ? "none" : "copy";
      }}
      onDragLeave={(event) => {
        event.preventDefault();
        event.stopPropagation();
        depth.current = Math.max(0, depth.current - 1);
        if (!depth.current) resetDrag();
      }}
      onDrop={(event) => {
        event.preventDefault();
        event.stopPropagation();
        resetDrag();
        if (!unavailable) onFilesDropped(Array.from(event.dataTransfer.files));
      }}
    >
      <input
        type="file"
        ref={fileInputRef}
        onChange={onFileChange}
        disabled={unavailable}
        className="hidden"
      />
      <Button
        variant="unstyled"
        type="button"
        disabled={unavailable}
        onClick={onTriggerFileSelect}
        className={`relative focus-visible:z-10 group flex w-full flex-col items-center justify-center rounded-panel border-2 border-dashed p-6 text-left transition-colors duration-200 hover:border-info-outline hover:bg-background motion-reduce:transition-none ${isDragging ? "border-info-outline bg-info-soft" : "border-border"}`}
      >
        <div className="mb-3 rounded-panel bg-background p-3 text-muted-foreground transition-colors duration-200 group-hover:bg-info-soft group-hover:text-info-content motion-reduce:transition-none">
          <UploadCloud size={24} aria-hidden="true" />
        </div>
        <span className="text-sm font-semibold text-foreground">
          {isUploading
            ? "Uploading version…"
            : isDragging
              ? "Drop file to upload a version"
              : "Upload new version"}
        </span>
        <span className="mt-1 text-xs font-semibold text-muted-foreground">
          {VERSION_MESSAGES.dropHelp}
        </span>
      </Button>
    </div>
  );
}
