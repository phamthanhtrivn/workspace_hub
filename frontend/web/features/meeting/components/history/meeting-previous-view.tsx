"use client";

import { Grid, List, RotateCcw, VideoOff } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  meetingHistoryPageSize,
  useMeetingHistory,
} from "../../hooks/useMeetingHistory";
import { MeetingHistoryViewMode } from "../../types/meeting.types";
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
  const historyQuery = useMeetingHistory({ page, enabled: true });
  const historyPage = historyQuery.data?.data;
  const meetings = historyPage?.items ?? [];
  const totalPages = historyPage?.totalPages ?? 1;
  const total = historyPage?.total ?? 0;
  const isInitialLoading = historyQuery.isLoading && !historyPage;

  return (
    <section className="flex flex-1 flex-col gap-5">
      <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white px-4 py-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-black text-[#172B4D]">
            Previous meetings
          </h1>
          <p className="mt-1 text-sm font-semibold text-slate-500">
            Review sessions you hosted or joined.
          </p>
        </div>

        <div
          className="flex w-fit rounded-lg border border-slate-200 bg-slate-100 p-1"
          role="tablist"
          aria-label="Meeting history layout"
        >
          {historyViewModeItems.map((item) => {
            const isActive = item.id === viewMode;

            return (
              <MeetingIconButton
                key={item.id}
                label={item.label}
                icon={item.icon}
                onClick={() => setViewMode(item.id)}
                className={cn(
                  "size-9",
                  isActive
                    ? "bg-white text-[#0052CC] shadow-sm hover:bg-white"
                    : "text-slate-500 hover:text-[#172B4D]",
                )}
              />
            );
          })}
        </div>
      </div>

      {isInitialLoading ? (
        <MeetingLoadingState label="Loading meeting history..." />
      ) : historyQuery.isError ? (
        <div className="grid min-h-80 place-items-center rounded-lg border border-dashed border-red-200 bg-white/70 px-4">
          <div className="flex max-w-sm flex-col items-center text-center">
            <VideoOff className="h-9 w-9 text-red-500" />
            <p className="mt-3 text-sm font-black text-slate-700">
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
          title="No meeting history yet"
          description="Past meetings will show up here after sessions end."
        />
      ) : (
        <div className="flex flex-col gap-5">
          {viewMode === MeetingHistoryViewMode.GRID ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {meetings.map((meeting) => (
                <MeetingHistoryCard key={meeting.id} meeting={meeting} />
              ))}
            </div>
          ) : (
            <div className="grid gap-3">
              {meetings.map((meeting) => (
                <MeetingHistoryListRow key={meeting.id} meeting={meeting} />
              ))}
            </div>
          )}

          <MeetingPagination
            page={page}
            limit={meetingHistoryPageSize}
            total={total}
            totalPages={totalPages}
            onPageChange={setPage}
          />
        </div>
      )}
    </section>
  );
}
