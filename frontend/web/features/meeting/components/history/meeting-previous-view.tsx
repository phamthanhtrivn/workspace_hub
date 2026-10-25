"use client";

import { Grid, List, RotateCcw, VideoOff } from "lucide-react";
import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import {
  meetingHistoryPageSize,
  useMeetingHistory,
} from "../../hooks/useMeetingHistory";
import { MeetingHistoryViewMode } from "../../types/meeting.types";
import type { MeetingHistoryBulkVisibilityPayload, MeetingHistoryItem, MeetingHistoryVisibility } from "../../types/meeting.types";
import { MEETING_HISTORY_BULK_LABELS, MEETING_HISTORY_LABELS, MEETING_STATUS } from "../../types/meeting.constants";
import { useMeetingHistoryBulkVisibility } from "../../hooks/useMeetingHistoryBulkVisibility";
import { MeetingHistoryBulkToolbar } from "./meeting-history-bulk-toolbar";
import { MeetingHistoryBulkConfirmDialog } from "./meeting-history-bulk-confirm-dialog";
import { getMeetingHistoryTitle } from "../../utils/meeting-history.utils";
import { useMeetingHistoryVisibility } from "../../hooks/useMeetingHistoryVisibility";
import { MeetingHistoryActions } from "./meeting-history-actions";
import { MeetingHistoryCard } from "./meeting-history-card";
import { MeetingHistoryListRow } from "./meeting-history-list-row";
import { MeetingPagination } from "../common/meeting-pagination";
import { MeetingEmptyState } from "../ui/meeting-empty-state";
import { MeetingButton } from "../ui/meeting-form-controls";
import { MeetingIconButton } from "../ui/meeting-icon-button";
import { MeetingLoadingState } from "../ui/meeting-loading-state";

const historyViewModeItems = [
  {
    id: MeetingHistoryViewMode.GRID,
    label: "Grid view",
    icon: Grid,
  },
  {
    id: MeetingHistoryViewMode.LIST,
    label: "List view",
    icon: List,
  },
] as const;

export function MeetingPreviousView() {
  const [page, setPage] = useState(1);
  const [viewMode, setViewMode] = useState(MeetingHistoryViewMode.GRID);
  const [visibility, setVisibility] = useState<MeetingHistoryVisibility>("visible");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkRequest, setBulkRequest] = useState<MeetingHistoryBulkVisibilityPayload | null>(null);
  const { setVisibility: updateVisibility, isPending: singlePending } = useMeetingHistoryVisibility();
  const { updateBulk, isPending: bulkPending } = useMeetingHistoryBulkVisibility();
  const isPending = singlePending || bulkPending;
  const historyQuery = useMeetingHistory({ page, enabled: true, visibility, refetchOnWindowFocus: true });
  const historyPage = historyQuery.data?.data;
  const meetings = historyPage?.items ?? [];
  const totalPages = historyPage?.totalPages ?? 1;
  const total = historyPage?.total ?? 0;
  const isInitialLoading = historyQuery.isLoading && !historyPage;
  const isHidden = visibility === "hidden";
  const eligibleMeetings = meetings.filter((meeting) => isHidden || meeting.status === MEETING_STATUS.ENDED || meeting.status === MEETING_STATUS.CANCELLED);
  const currentSelection = eligibleMeetings.filter((meeting) => selectedIds.includes(meeting.id)).map((meeting) => meeting.id);

  const changePage = (nextPage: number) => {
    if (isPending) return;
    setPage(nextPage);
    setSelectedIds([]);
  };
  const selectionFor = (meeting: MeetingHistoryItem) => (
    <Checkbox className="relative z-20 shrink-0" aria-label={`${MEETING_HISTORY_BULK_LABELS.selectMeeting}: ${getMeetingHistoryTitle(meeting)}`}
      checked={currentSelection.includes(meeting.id)} disabled={isPending || !eligibleMeetings.some((candidate) => candidate.id === meeting.id)}
      onCheckedChange={(checked) => setSelectedIds((current) => checked ? [...new Set([...current, meeting.id])] : current.filter((id) => id !== meeting.id))} />
  );
  const confirmBulk = async () => {
    if (!bulkRequest || isPending) return;
    if (await updateBulk(bulkRequest)) {
      setSelectedIds([]);
      setBulkRequest(null);
    }
  };

  if (historyPage && page > totalPages) setPage(totalPages);

  return (
    <section className="flex flex-1 flex-col gap-5">
      <div className="flex flex-col gap-3 rounded-lg border border-border bg-card px-4 py-4 @min-[600px]/meeting-content:flex-row @min-[600px]/meeting-content:items-center @min-[600px]/meeting-content:justify-between">
        <div>
          <h1 className="text-page-title font-semibold text-foreground">
            Previous meetings
          </h1>
          <p className="mt-1 text-sm font-semibold text-muted-foreground">
            Review sessions you hosted or joined.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div role="group" aria-label={MEETING_HISTORY_LABELS.filter} className="flex flex-wrap gap-1">
            {(["visible", "hidden"] as const).map((scope) => (
              <MeetingButton
                key={scope}
                type="button"
                tone={scope === visibility ? "secondary" : "ghost"}
                disabled={isPending}
                aria-pressed={scope === visibility}
                onClick={() => { setVisibility(scope); setPage(1); setSelectedIds([]); }}
              >
                {MEETING_HISTORY_LABELS[scope]}
              </MeetingButton>
            ))}
          </div>
          <div
            className="flex w-fit rounded-lg border border-border bg-muted p-1"
            role="group"
            aria-label="Meeting history layout"
          >
            {historyViewModeItems.map((item) => {
              const isActive = item.id === viewMode;

              return (
                <MeetingIconButton
                  key={item.id}
                  label={item.label}
                  aria-pressed={isActive}
                  icon={item.icon}
                  onClick={() => setViewMode(item.id)}
                  className={cn(
                    "size-9",
                    isActive
                      ? "bg-card text-info-content hover:bg-card"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                />
              );
            })}
          </div>
        </div>
      </div>

      {historyPage && !historyQuery.isError && (
        <MeetingHistoryBulkToolbar hidden={isHidden} selectedCount={currentSelection.length} eligibleCount={eligibleMeetings.length}
          actionableTotal={historyPage.actionableTotal ?? 0} disabled={isPending || historyQuery.isFetching}
          onSelectPage={(checked) => setSelectedIds(checked ? eligibleMeetings.map((meeting) => meeting.id) : [])}
          onSelected={() => setBulkRequest({ scope: "selected", hidden: !isHidden, meetingIds: currentSelection, expectedCount: currentSelection.length })}
          onAll={() => setBulkRequest({ scope: "all", hidden: !isHidden, expectedCount: historyPage.actionableTotal })} />
      )}

      {isInitialLoading ? (
        <MeetingLoadingState label="Loading meeting history..." />
      ) : historyQuery.isError ? (
        <div className="grid min-h-80 place-items-center rounded-lg border border-dashed border-border bg-card px-4">
          <div className="flex max-w-sm flex-col items-center text-center">
            <VideoOff className="h-9 w-9 text-destructive-content" />
            <p className="mt-3 text-sm font-semibold text-foreground">
              Could not load meeting history.
            </p>
            <MeetingButton
              type="button"
              onClick={() => historyQuery.refetch()}
              className="mt-4 cursor-pointer"
            >
              <RotateCcw className="h-4 w-4" />
              Try again
            </MeetingButton>
          </div>
        </div>
      ) : meetings.length === 0 ? (
        <MeetingEmptyState
          icon={VideoOff}
          title={isHidden ? MEETING_HISTORY_LABELS.hiddenEmptyTitle : MEETING_HISTORY_BULK_LABELS.visibleEmptyTitle}
          description={isHidden ? MEETING_HISTORY_LABELS.hiddenEmptyDescription : MEETING_HISTORY_BULK_LABELS.visibleEmptyDescription}
        />
      ) : (
        <div className="flex flex-col gap-5">
          {viewMode === MeetingHistoryViewMode.GRID ? (
            <div className="grid gap-4 @min-[600px]/meeting-content:grid-cols-2 @min-[960px]/meeting-content:grid-cols-3">
              {meetings.map((meeting) => (
                <MeetingHistoryCard key={meeting.id} meeting={meeting} selection={selectionFor(meeting)} actions={
                  <MeetingHistoryActions meeting={meeting} hidden={isHidden} disabled={isPending} onChange={updateVisibility} />
                } />
              ))}
            </div>
          ) : (
            <div className="grid gap-3">
              {meetings.map((meeting) => (
                <MeetingHistoryListRow key={meeting.id} meeting={meeting} selection={selectionFor(meeting)} actions={
                  <MeetingHistoryActions meeting={meeting} hidden={isHidden} disabled={isPending} onChange={updateVisibility} />
                } />
              ))}
            </div>
          )}

          <MeetingPagination
            page={page}
            limit={meetingHistoryPageSize}
            total={total}
            totalPages={totalPages}
            onPageChange={changePage}
          />
        </div>
      )}
      <MeetingHistoryBulkConfirmDialog request={bulkRequest} pending={isPending} onClose={() => setBulkRequest(null)} onConfirm={confirmBulk} />
    </section>
  );
}
