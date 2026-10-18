import React from "react";
import { UploadState } from "../../types/documents.enums";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";

interface UploadProgressProps {
  uploadState: UploadState;
  uploadProgress: number;
  uploadingFileName: string;
}

function UploadProgress({
  uploadState,
  uploadProgress,
  uploadingFileName,
}: UploadProgressProps) {
  if (uploadState === UploadState.IDLE) {
    return null;
  }

  const getStatusLabel = () => {
    switch (uploadState) {
      case UploadState.INITIATING:
        return "PREPARING...";
      case UploadState.UPLOADING:
        return "UPLOADING...";
      case UploadState.CONFIRMING:
        return "PROCESSING...";
      case UploadState.SUCCESS:
        return "UPLOAD COMPLETE";
      case UploadState.ERROR:
        return "UPLOAD FAILED";
      default:
        return "UPLOADING...";
    }
  };

  return (
    <div className="absolute bottom-6 right-6 z-50 bg-card border border-border p-5 rounded-panel w-80 max-w-[calc(100vw-1.5rem)] animate-in slide-in-from-bottom-5 duration-200 shadow-panel">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {getStatusLabel()}
        </span>
        <span className="text-xs font-semibold text-info-content">
          {uploadProgress}%
        </span>
      </div>

      <div className="text-sm font-semibold text-foreground truncate mb-3">
        {uploadingFileName}
      </div>

      <Progress value={uploadProgress} className="w-full bg-muted rounded-full h-2 overflow-hidden border border-border">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-200",
            uploadState === UploadState.ERROR
              ? "bg-destructive-content"
              : uploadState === UploadState.SUCCESS
                ? "bg-success-content"
                : "bg-link",
          )}
          style={{ width: `${uploadProgress}%` }}
        />
      </Progress>
    </div>
  );
}

export default React.memo(UploadProgress);
