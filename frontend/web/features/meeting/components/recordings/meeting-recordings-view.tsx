"use client";

import { showMeetingActionError } from "../../utils/meeting-action-errors";
import { useEffect, useState } from "react";
import { Pencil, Radio, RefreshCw, Save } from "lucide-react";
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
import { MeetingRecordingCard } from "./meeting-recording-card";
import { MeetingPagination } from "../common/meeting-pagination";
import { MeetingRecordingPlayer } from "./meeting-recording-player";
import { MeetingRecordingShareDialog } from "./meeting-recording-share-dialog";
import { MeetingRecordingFilters } from "./meeting-recording-filters";
import {
  recordingDateBounds,
  type RecordingDateFilter,
} from "../../utils/recording-date-filter";
import { MEETING_LIST_PAGE_SIZE } from "../../types/meeting.constants";
import { LoadingState } from "@/components/ui/loading-state";

export function MeetingRecordingsView() {
  const [search, setSearch] = useState("");
  const [dates, setDates] = useState<RecordingDateFilter>({ from: "", to: "" });
  const [params, setParams] = useState<RecordingQuery>({
    page: 1,
    limit: MEETING_LIST_PAGE_SIZE,
    scope: "all",
  });
  const { query, remove, refresh } = useMeetingRecordings(params);
  const hasFilters = Boolean(
    search.trim() || dates.from || dates.to || params.scope !== "all",
  );
  const updateDates = (next: RecordingDateFilter) => {
    setDates(next);
    const { invalid, fromDate, toDate } = recordingDateBounds(next);
    if (!invalid)
      setParams((current) => ({ ...current, page: 1, fromDate, toDate }));
  };
  const resetFilters = () => {
    setSearch("");
    setDates({ from: "", to: "" });
    setParams((current) => ({
      ...current,
      page: 1,
      scope: "all",
      search: "",
      fromDate: undefined,
      toDate: undefined,
    }));
  };
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setParams((current) =>
        current.search === search.trim()
          ? current
          : {
              ...current,
              page: 1,
              search: search.trim(),
            },
      );
    }, 300);

    return () => window.clearTimeout(timer);
  }, [search]);
  if (
    query.data &&
    !query.isFetching &&
    (params.page ?? 1) > query.data.totalPages
  ) {
    setParams((current) => ({
      ...current,
      page: Math.max(1, query.data!.totalPages),
    }));
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
    onError: (error) =>
      showMeetingActionError(error, recordingErrorMessage(error)),
  });
  const edit = useMutation({
    mutationFn: () => recordingApi.rename(rename!.id, title),
    onSuccess: () => {
      setRename(null);
      refresh();
    },
    onError: (error) =>
      showMeetingActionError(error, recordingErrorMessage(error)),
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
      <MeetingRecordingFilters
        search={search}
        onSearchChange={setSearch}
        scope={params.scope ?? "all"}
        onScopeChange={(scope) =>
          setParams((current) => ({ ...current, page: 1, scope }))
        }
        dates={dates}
        onDatesChange={updateDates}
        invalidDates={recordingDateBounds(dates).invalid}
        onReset={resetFilters}
      />
      {query.isLoading ? (
        <LoadingState
          label="Loading recordings…"
          layout="centered"
          className="py-12 text-center"
        />
      ) : query.isError ? (
        <div
          role="alert"
          className="rounded-panel border border-border bg-card p-6 text-card-foreground"
        >
          <p>Could not load recordings.</p>
          <MeetingButton className="mt-3" onClick={refresh}>
            <RefreshCw className="size-4" aria-hidden="true" />
            Try again
          </MeetingButton>
        </div>
      ) : !query.data?.items.length ? (
        <div className="rounded-panel border border-border bg-card px-6 py-12 text-center text-card-foreground">
          <Radio className="mx-auto mb-3 size-8 text-muted-foreground" />
          <p className="font-semibold">
            {hasFilters ? "No matching recordings" : "No recordings yet"}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            {hasFilters
              ? "Try another search, access filter or date range."
              : "Start a recording during a meeting, or ask the owner to share one."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {query.data.items.map((recording) => (
            <MeetingRecordingCard
              key={recording.id}
              recording={recording}
              downloading={
                download.isPending && download.variables === recording.id
              }
              deleting={remove.isPending && remove.variables === recording.id}
              downloadDisabled={download.isPending}
              deleteDisabled={remove.isPending}
              onWatch={() => setWatch(recording)}
              onDownload={() => download.mutate(recording.id)}
              onShare={() => setShare(recording)}
              onRename={() => {
                setRename(recording);
                setTitle(recording.title);
              }}
              onDelete={() => void deleteRecording(recording)}
            />
          ))}
        </div>
      )}
      {query.data && (
        <MeetingPagination
          page={query.data.page}
          limit={params.limit ?? MEETING_LIST_PAGE_SIZE}
          total={query.data.total}
          totalPages={query.data.totalPages}
          showSinglePage
          onPageChange={(page) =>
            setParams((current) => ({ ...current, page }))
          }
        />
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
          recording={
            query.data?.items.find((item) => item.id === share.id) ?? share
          }
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
          <DialogTitle
            id="recording-rename-title"
            className="flex items-center gap-2"
          >
            <Pencil className="size-4" aria-hidden="true" />
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
            <MeetingButton
              loading={edit.isPending}
              type="submit"
              disabled={edit.isPending || !title.trim()}
            >
              <Save className="size-4" aria-hidden="true" />
              Save
            </MeetingButton>
          </form>
        </DialogContent>
      </Dialog>
      <MeetingAlertDialog {...alertDialogProps} />
    </section>
  );
}
