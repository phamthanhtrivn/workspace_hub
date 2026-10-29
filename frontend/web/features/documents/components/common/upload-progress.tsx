import React from "react";
import { UploadState } from "../../types/documents.enums";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";

interface UploadProgressProps {
  uploadState: UploadState;
  uploadProgress: number;
  uploadingFileName: string;
  summary?: { succeeded: number; failed: number; skipped: number };
  onRetry?: () => void;
}

function UploadProgress({
  uploadState,
  uploadProgress,
  uploadingFileName,
  summary, onRetry,
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
      case UploadState.PARTIAL:
        return "SOME UPLOADS FAILED";
      case UploadState.SKIPPED:
        return "UPLOADS SKIPPED";
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

      {summary && <p role="status" className="mb-2 text-xs text-muted-foreground">{summary.succeeded} uploaded · {summary.failed} failed · {summary.skipped} skipped</p>}
      {Boolean(summary?.failed) && <Button type="button" variant="outline" size="sm" className="mb-2" onClick={onRetry}>Retry failed files</Button>}
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
