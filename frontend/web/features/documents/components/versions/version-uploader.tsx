"use client";

import React from "react";
import { UploadCloud, Loader2, CheckCircle2 } from "lucide-react";
import { UploadState } from "../../types/documents.enums";

interface VersionUploaderProps {
  uploadState: UploadState;
  uploadProgress: number;
  uploadingFileName: string;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onTriggerFileSelect: () => void;
}

export function VersionUploader({
  uploadState,
  uploadProgress,
  uploadingFileName,
  fileInputRef,
  onFileChange,
  onTriggerFileSelect,
}: VersionUploaderProps) {
  const uploadStatusMessages: Partial<Record<UploadState, string>> = {
    [UploadState.INITIATING]: "Initiating upload...",
    [UploadState.UPLOADING]: "Uploading to storage...",
    [UploadState.CONFIRMING]: "Confirming new version...",
    [UploadState.SUCCESS]: "Version uploaded successfully!",
    [UploadState.ERROR]: "An upload error occurred",
  };
  const statusMessage = uploadStatusMessages[uploadState];

  return (
    <div className="mb-6">
      <input
        type="file"
        ref={fileInputRef}
        onChange={onFileChange}
        className="hidden"
      />
      {uploadState === UploadState.IDLE ? (
        <div
          onClick={onTriggerFileSelect}
          className="flex flex-col items-center justify-center border-2 border-dashed border-border rounded-panel p-6 hover:bg-background hover:border-info-outline cursor-pointer transition-all duration-200 group"
        >
          <div className="p-3 bg-background text-muted-foreground rounded-panel group-hover:bg-info-soft group-hover:text-info-content transition-all duration-200 mb-3">
            <UploadCloud size={24} />
          </div>
          <span className="text-sm font-semibold text-foreground">
            Upload new version
          </span>
          <span className="text-xs text-muted-foreground font-semibold mt-1">
            Old versions will be kept safely in history
          </span>
        </div>
      ) : (
        <div className="border border-border rounded-panel p-5 bg-background">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 min-w-0">
              {uploadState === UploadState.SUCCESS ? (
                <CheckCircle2
                  size={16}
                  className="text-success-content shrink-0"
                />
              ) : (
                <Loader2
                  size={16}
                  className="text-info-content animate-spin shrink-0"
                />
              )}
              <span className="text-xs font-semibold text-foreground truncate max-w-xs">
                {uploadingFileName}
              </span>
            </div>
            <span className="text-xs font-semibold text-muted-foreground">
              {uploadProgress}%
            </span>
          </div>
          <div className="w-full bg-muted h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-link h-full rounded-full transition-all duration-200"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground font-semibold mt-2">
            {statusMessage}
          </p>
        </div>
      )}
    </div>
  );
}
