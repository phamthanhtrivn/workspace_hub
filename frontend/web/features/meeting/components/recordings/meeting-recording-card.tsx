"use client";

import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  Download,
  HardDrive,
  MoreHorizontal,
  Pencil,
  Play,
  Share2,
  Trash2,
  Video,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PERMISSION_REASON } from "@/lib/permission-feedback";
import { cn } from "@/lib/utils";
import type {
  MeetingRecording,
  RecordingStatus,
} from "../../types/meeting-recording.types";
import { recordingFailureMessage } from "../../utils/recording-errors";
import { MeetingButton } from "../ui/meeting-form-controls";

const recordingStatusPresentation: Record<
  RecordingStatus,
  { label: string; className: string }
> = {
  STARTING: { label: "Starting", className: "bg-info-soft text-info-content" },
  RECORDING: {
    label: "Recording",
    className: "bg-info-soft text-info-content",
  },
  PAUSING: {
    label: "Pausing",
    className: "bg-warning-soft text-warning-content",
  },
  PAUSED: {
    label: "Paused",
    className: "bg-warning-soft text-warning-content",
  },
  PROCESSING: {
    label: "Processing",
    className: "bg-info-soft text-info-content",
  },
  COMPLETED: {
    label: "Ready",
    className: "bg-success-soft text-success-content",
  },
  FAILED: {
    label: "Failed",
    className: "bg-destructive-soft text-destructive-content",
  },
  DELETED: { label: "Deleted", className: "bg-muted text-muted-foreground" },
};

interface MeetingRecordingCardProps {
  recording: MeetingRecording;
  downloading: boolean;
  deleting: boolean;
  downloadDisabled: boolean;
  deleteDisabled: boolean;
  onWatch: () => void;
  onDownload: () => void;
  onShare: () => void;
  onRename: () => void;
  onDelete: () => void;
}

export function MeetingRecordingCard({
  recording,
  downloading,
  deleting,
  downloadDisabled,
  deleteDisabled,
  onWatch,
  onDownload,
  onShare,
  onRename,
  onDelete,
}: MeetingRecordingCardProps) {
  const ready = recording.status === "COMPLETED";
  const presentation = recordingStatusPresentation[recording.status];

  return (
    <article className="flex min-w-0 flex-col gap-4 rounded-panel border border-border bg-card p-4 text-card-foreground @min-[960px]/meeting-content:flex-row @min-[960px]/meeting-content:items-center">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <span className="grid size-11 shrink-0 place-items-center rounded-control bg-secondary text-secondary-foreground">
          <Video className="size-5" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <h2 className="min-w-0 break-words text-sm font-semibold leading-6 [overflow-wrap:anywhere]">
              {recording.title}
            </h2>
            <span
              className={cn(
                "inline-flex shrink-0 items-center gap-1 rounded-control px-2 py-1 text-xs font-medium",
                presentation.className,
              )}
            >
              {ready && (
                <CheckCircle2 className="size-3.5" aria-hidden="true" />
              )}
              {presentation.label}
            </span>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs tabular-nums text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays className="size-3.5 shrink-0" aria-hidden="true" />
              <time dateTime={recording.requestedAt}>
                {new Date(recording.requestedAt).toLocaleString()}
              </time>
            </span>
            {recording.durationSeconds != null && (
              <span className="inline-flex items-center gap-1.5">
                <Clock3 className="size-3.5" aria-hidden="true" />
                {Math.floor(recording.durationSeconds / 60)}m{" "}
                {recording.durationSeconds % 60}s
              </span>
            )}
            {recording.sizeBytes && (
              <span className="inline-flex items-center gap-1.5">
                <HardDrive className="size-3.5" aria-hidden="true" />
                {(Number(recording.sizeBytes) / 1024 / 1024).toFixed(1)} MB
              </span>
            )}
          </div>
          {recording.failureCode && (
            <p
              className={cn(
                "mt-2 text-xs leading-5",
                recording.status === "FAILED"
                  ? "text-destructive-content"
                  : "text-muted-foreground",
              )}
            >
              {recordingFailureMessage(recording.failureCode, recording.status)}
            </p>
          )}
        </div>
      </div>
      <div
        className="flex shrink-0 flex-wrap items-center gap-2 border-t border-border pt-3 @min-[960px]/meeting-content:border-t-0 @min-[960px]/meeting-content:pt-0"
        role="group"
        aria-label={`Actions for ${recording.title}`}
      >
        <MeetingButton disabled={!ready} onClick={onWatch}>
          <Play className="size-4" aria-hidden="true" />
          Watch
        </MeetingButton>
        <MeetingButton
          tone="outline"
          disabledReason={
            !recording.capabilities.canDownload
              ? PERMISSION_REASON.recordingDownload
              : undefined
          }
          disabled={!ready || downloadDisabled}
          loading={downloading}
          onClick={onDownload}
        >
          <Download className="size-4" aria-hidden="true" />
          Download
        </MeetingButton>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <MeetingButton
              tone="outline"
              className="size-10 p-0"
              aria-label={`More actions for ${recording.title}`}
              disabled={deleting}
            >
              <MoreHorizontal className="size-4" aria-hidden="true" />
            </MeetingButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="[&_[data-slot=dropdown-menu-item]]:w-full [&_[data-slot=dropdown-menu-item]]:justify-start"
          >
            <DropdownMenuItem
              disabledReason={
                !recording.capabilities.canManage
                  ? PERMISSION_REASON.recordingManage
                  : undefined
              }
              onClick={onShare}
            >
              <Share2 className="size-4 shrink-0" aria-hidden="true" />
              Share
            </DropdownMenuItem>
            <DropdownMenuItem
              disabledReason={
                !recording.capabilities.canManage
                  ? PERMISSION_REASON.recordingManage
                  : undefined
              }
              onClick={onRename}
            >
              <Pencil className="size-4 shrink-0" aria-hidden="true" />
              Rename
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive-content data-[highlighted]:bg-destructive-soft data-[highlighted]:text-destructive-content"
              disabledReason={
                !recording.capabilities.canManage
                  ? PERMISSION_REASON.recordingManage
                  : undefined
              }
              disabled={deleteDisabled}
              onClick={onDelete}
            >
              <Trash2 className="size-4 shrink-0" aria-hidden="true" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </article>
  );
}
