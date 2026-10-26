"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Download, Play, Radio, Share2, Trash2 } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { recordingApi } from "../../api/meeting-recording.api";
import { useMeetingRecordings } from "../../hooks/useMeetingRecordings";
import { useMeetingConfirmDialog } from "../../hooks/useMeetingConfirmDialog";
import { recordingErrorMessage } from "../../utils/recording-errors";
import type {
  MeetingRecording,
  RecordingQuery,
} from "../../types/meeting-recording.types";
import { MeetingAlertDialog } from "../common/meeting-alert-dialog";
import { MeetingButton, MeetingInput } from "../ui/meeting-form-controls";
import { MeetingRecordingPlayer } from "./meeting-recording-player";
import { MeetingRecordingShareDialog } from "./meeting-recording-share-dialog";
import { CustomSelect } from "@/components/ui/custom/custom-select";
import { MEETING_LIST_PAGE_SIZE } from "../../types/meeting.constants";
import { LoadingState } from "@/components/ui/loading-state";


export function MeetingRecordingsView() {
  const [search, setSearch] = useState("");
  const [params, setParams] = useState<RecordingQuery>({
    page: 1,
    limit: MEETING_LIST_PAGE_SIZE,
    scope: "all",
  });
  const { query, remove, refresh } = useMeetingRecordings(params);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setParams((current) => current.search === search.trim() ? current : {
        ...current, page: 1, search: search.trim(),
      });
    }, 300);
    return () => window.clearTimeout(timer);
  }, [search]);
  if (query.data && !query.isFetching && (params.page ?? 1) > query.data.totalPages) {
    setParams((current) => ({ ...current, page: Math.max(1, query.data!.totalPages) }));
  }
  const [watch, setWatch] = useState<MeetingRecording | null>(null);
  const [share, setShare] = useState<MeetingRecording | null>(null);
  const [rename, setRename] = useState<MeetingRecording | null>(null);
  const [title, setTitle] = useState("");
  const { confirm, alertDialogProps } = useMeetingConfirmDialog();
  const download = useMutation({
    mutationFn: async (id: string) => {
      const result = await recordingApi.url(id, true);
      window.location.assign(result.url);
    },
    onError: (error) => toast.error(recordingErrorMessage(error)),
  });
  const edit = useMutation({
    mutationFn: () => recordingApi.rename(rename!.id, title),
    onSuccess: () => {
      setRename(null);
      refresh();
    },
    onError: (error) => toast.error(recordingErrorMessage(error)),
  });

  const deleteRecording = async (recording: MeetingRecording) => {
    if (
      await confirm({
        title: "Delete this recording?",
        description:
          "Access will be removed and the video will be deleted from storage.",
        confirmLabel: "Delete",
        cancelLabel: "Cancel",
      })
    )
      remove.mutate(recording.id);
  };

  return (
    <section aria-label="Meeting recordings" className="space-y-5">
      <div>
        <h1 className="text-page-title font-semibold">Recordings</h1>
        <p className="mt-1 text-sm tabular-nums text-muted-foreground">
          Your recordings and videos shared with you.
        </p>
      </div>
      <div className="flex flex-wrap gap-3">
        <MeetingInput
          aria-label="Search recordings"
          placeholder="Search recordings…"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="max-w-sm bg-card"
        />
        <CustomSelect
          ariaLabel="Recording access filter"
          triggerClassName="h-10 cursor-pointer rounded-control border border-input bg-card px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          value={params.scope ?? "all"}
          onChange={nextValue =>
            setParams((current) => ({
              ...current,
              page: 1,
              scope: nextValue as RecordingQuery["scope"],
            }))
          }
        >
          <option value="all">All accessible</option>
          <option value="owned">Owned by me</option>
          <option value="shared">Shared with me</option>
        </CustomSelect>
        <MeetingButton tone="outline" onClick={refresh}>
          Refresh
        </MeetingButton>
      </div>
      {query.isLoading ? (
        <LoadingState label="Loading recordings…" layout="centered" className="py-12 text-center" />
      ) : query.isError ? (
        <div role="alert" className="rounded-panel border border-border bg-card p-6 text-card-foreground">
          <p>Could not load recordings.</p>
          <MeetingButton className="mt-3" onClick={refresh}>
            Try again
          </MeetingButton>
        </div>
      ) : !query.data?.items.length ? (
        <div className="rounded-panel border border-border bg-card px-6 py-12 text-center text-card-foreground">
          <Radio className="mx-auto mb-3 size-8 text-muted-foreground" />
          <p className="font-semibold">No recordings yet</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Start a recording during a meeting, or ask the owner to share one.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-border rounded-panel border border-border bg-card text-card-foreground">
          {query.data.items.map((recording) => (
            <article
              key={recording.id}
              className="flex flex-wrap items-center justify-between gap-4 p-5"
            >
              <div className="min-w-0 flex-1">
                <h2 className="line-clamp-2 break-words font-semibold leading-6">{recording.title}</h2>
                <p className="mt-1 text-sm tabular-nums text-muted-foreground">
                  {new Date(recording.requestedAt).toLocaleString()} ·{" "}
                  {recording.status === "RECORDING"
                    ? "Recording"
                    : recording.status === "STARTING"
                      ? "Starting"
                      : recording.status === "PAUSING" ? "Pausing"
                      : recording.status === "PAUSED" ? "Paused"
                      : recording.status === "PROCESSING"
                        ? "Processing"
                        : recording.status === "FAILED"
                          ? "Failed"
                          : "Ready"}
                  {recording.durationSeconds != null
                    ? ` · ${Math.floor(recording.durationSeconds / 60)}m ${recording.durationSeconds % 60}s`
                    : ""}
                  {recording.sizeBytes
                    ? ` · ${(Number(recording.sizeBytes) / 1024 / 1024).toFixed(1)} MB`
                    : ""}
                </p>
                {recording.failureCode && (
                  <p className="mt-1 text-xs text-destructive-content">
                    {recording.failureCode === "UPLOAD_BACKUP_REQUIRES_RECOVERY"
                      ? "Upload failed. Contact the meeting administrator to recover the saved video."
                      : recording.status === "FAILED"
                        ? "Recording could not be completed."
                        : "Verifying upload…"}
                  </p>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                <MeetingButton
                  disabled={recording.status !== "COMPLETED"}
                  onClick={() => setWatch(recording)}
                >
                  <Play className="size-4" />
                  Watch
                </MeetingButton>
                {recording.capabilities.canDownload && (
                  <MeetingButton loading={download.isPending && download.variables === recording.id}
                    tone="outline"
                    disabled={
                      recording.status !== "COMPLETED" || download.isPending
                    }
                    onClick={() => download.mutate(recording.id)}
                  >
                    <Download className="size-4" />
                    Download
                  </MeetingButton>
                )}
                {recording.capabilities.canManage && (
                  <>
                    <MeetingButton
                      tone="outline"
                      onClick={() => setShare(recording)}
                    >
                      <Share2 className="size-4" />
                      Share
                    </MeetingButton>
                    <MeetingButton
                      tone="ghost"
                      onClick={() => {
                        setRename(recording);
                        setTitle(recording.title);
                      }}
                    >
                      Rename
                    </MeetingButton>
                    <MeetingButton loading={remove.isPending && remove.variables === recording.id}
                      tone="danger"
                      disabled={
                        remove.isPending ||
                        !["COMPLETED", "FAILED"].includes(recording.status)
                      }
                      onClick={() => void deleteRecording(recording)}
                    >
                      <Trash2 className="size-4" />
                      Delete
                    </MeetingButton>
                  </>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
      {query.data && query.data.totalPages > 1 && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <MeetingButton
            tone="outline"
            disabled={(params.page ?? 1) <= 1}
            onClick={() =>
              setParams((current) => ({
                ...current,
                page: (current.page ?? 1) - 1,
              }))
            }
          >
            Previous
          </MeetingButton>
          <span className="text-sm">
            {params.page} / {query.data.totalPages}
          </span>
          <MeetingButton
            tone="outline"
            disabled={(params.page ?? 1) >= query.data.totalPages}
            onClick={() =>
              setParams((current) => ({
                ...current,
                page: (current.page ?? 1) + 1,
              }))
            }
          >
            Next
          </MeetingButton>
        </div>
      )}
      {watch && (
        <MeetingRecordingPlayer
          key={watch.id}
          recording={watch}
          onClose={() => setWatch(null)}
        />
      )}
      {share && (
        <MeetingRecordingShareDialog
          key={share.id}
          recording={query.data?.items.find((item) => item.id === share.id) ?? share}
          onClose={() => setShare(null)}
        />
      )}
      <Dialog
        open={rename !== null}
        onOpenChange={(open) => {
          if (!open) setRename(null);
        }}
      >
        <DialogContent className="p-6" aria-labelledby="recording-rename-title">
          <DialogTitle id="recording-rename-title">
            Rename recording
          </DialogTitle>
          <form
            className="mt-4 space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              edit.mutate();
            }}
          >
            <MeetingInput
              autoFocus
              aria-label="Recording title"
              maxLength={200}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
            />
            <MeetingButton loading={edit.isPending}
              type="submit"
              disabled={edit.isPending || !title.trim()}
            >
              Save
            </MeetingButton>
          </form>
        </DialogContent>
      </Dialog>
      <MeetingAlertDialog {...alertDialogProps} />
    </section>
  );
}
