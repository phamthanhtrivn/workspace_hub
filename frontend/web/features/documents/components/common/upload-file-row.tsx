"use client";

import { AlertCircle, Check, Clock3, FileText, Minus, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { UploadState } from "../../types/documents.enums";
import type { DocumentUploadEntry } from "../../types/upload.types";
import { formatBytes } from "../../utils/documents.utils";
import { uploadDisplayProgress, UPLOAD_STATE_LABELS } from "../../utils/upload-progress";

export function UploadFileRow({ upload, onRetry, retryDisabled }: {
  upload: DocumentUploadEntry;
  onRetry?: (id: string) => void;
  retryDisabled?: boolean;
}) {
  const success = upload.state === UploadState.SUCCESS;
  const failed = upload.state === UploadState.ERROR;
  const waiting = upload.state === UploadState.QUEUED || upload.state === UploadState.AWAITING_OVERWRITE;
  const skipped = upload.state === UploadState.SKIPPED;
  const percent = uploadDisplayProgress(upload.progress, upload.state);
  const label = UPLOAD_STATE_LABELS[upload.state];
  return (
    <li className="flex min-w-0 items-center gap-3 px-4 py-3">
      <FileText aria-hidden="true" className="size-5 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <p title={upload.fileName} className="truncate text-sm font-medium text-foreground">{upload.fileName}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{label} · {formatBytes(upload.sizeBytes)}</p>
        {upload.error && <p className="mt-1 break-words text-xs text-destructive-content">{upload.error}</p>}
      </div>
      {failed && onRetry && <Button type="button" variant="ghost" size="icon-sm"
        aria-label={`Retry ${upload.fileName}`} title="Retry upload" disabled={retryDisabled}
        onClick={() => onRetry(upload.id)}><RotateCcw aria-hidden="true" /></Button>}
      <span role={failed || skipped ? "img" : "progressbar"}
        aria-label={`${upload.fileName}: ${label}`} aria-valuemin={failed || skipped ? undefined : 0}
        aria-valuemax={failed || skipped ? undefined : 100} aria-valuenow={failed || skipped ? undefined : percent}
        aria-valuetext={failed || skipped ? undefined : label}
        className={cn("relative grid size-11 shrink-0 place-items-center text-xs font-semibold tabular-nums",
          success ? "text-success-content" : failed ? "text-destructive-content" : "text-link")}>
        <svg aria-hidden="true" viewBox="0 0 44 44" className="absolute inset-0 size-full -rotate-90 fill-none">
          <circle cx="22" cy="22" r="19" strokeWidth="3" className="stroke-border" />
          {!waiting && !skipped && <circle cx="22" cy="22" r="19" pathLength="100" stroke="currentColor" strokeWidth="3"
            strokeLinecap="round" strokeDasharray="100" strokeDashoffset={100 - percent}
            className="transition-[stroke-dashoffset] duration-200 motion-reduce:transition-none" />}
        </svg>
        {success ? <Check aria-hidden="true" className="size-5" />
          : failed ? <AlertCircle aria-hidden="true" className="size-5" />
          : skipped ? <Minus aria-hidden="true" className="size-4 text-muted-foreground" />
          : waiting ? <Clock3 aria-hidden="true" className="size-4 text-muted-foreground" />
          : <span>{percent}%</span>}
      </span>
    </li>
  );
}
