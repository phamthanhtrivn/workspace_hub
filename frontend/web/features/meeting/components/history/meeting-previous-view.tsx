"use client";

import { Grid, List, Loader2, RotateCcw, VideoOff } from "lucide-react";
import { useState } from "react";
import { useAppIntl } from "@/features/i18n/useAppIntl";
import { cn } from "@/lib/utils";
import {
  meetingHistoryPageSize,
  useMeetingHistory,
} from "../../hooks/useMeetingHistory";
import { MeetingHistoryViewMode } from "../../types/meeting.types";
import { MeetingHistoryCard } from "./meeting-history-card";
import { MeetingHistoryListRow } from "./meeting-history-list-row";
import { MeetingHistoryPagination } from "./meeting-history-pagination";

const historyViewModeItems = [
  {
    id: MeetingHistoryViewMode.GRID,
    labelId: "meeting.history.view.grid",
    icon: Grid,
  },
  {
    id: MeetingHistoryViewMode.LIST,
    labelId: "meeting.history.view.list",
    icon: List,
  },
] as const;

export function MeetingPreviousView() {
  const intl = useAppIntl();
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
            {intl.formatMessage({ id: "meeting.history.title" })}
          </h1>
          <p className="mt-1 text-sm font-semibold text-slate-500">
            {intl.formatMessage({ id: "meeting.history.description" })}
          </p>
        </div>

        <div
          className="flex w-fit rounded-lg border border-slate-200 bg-slate-100 p-1"
          role="tablist"
          aria-label={intl.formatMessage({ id: "meeting.history.viewLabel" })}
        >
          {historyViewModeItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.id === viewMode;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setViewMode(item.id)}
                className={cn(
                  "grid h-9 w-9 cursor-pointer place-items-center rounded-md transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0052CC]",
                  isActive
                    ? "bg-white text-[#0052CC] shadow-sm"
                    : "text-slate-500 hover:text-[#172B4D]",
                )}
                aria-label={intl.formatMessage({ id: item.labelId })}
                aria-selected={isActive}
                role="tab"
                title={intl.formatMessage({ id: item.labelId })}
              >
                <Icon className="h-4 w-4" />
              </button>
            );
          })}
        </div>
      </div>

      {isInitialLoading ? (
        <div className="grid min-h-80 place-items-center rounded-lg border border-dashed border-slate-200 bg-white/70">
          <div className="flex flex-col items-center text-center">
            <Loader2 className="h-8 w-8 animate-spin text-[#0052CC]" />
            <p className="mt-3 text-sm font-black text-slate-600">
              {intl.formatMessage({ id: "meeting.history.loading" })}
            </p>
          </div>
        </div>
      ) : historyQuery.isError ? (
        <div className="grid min-h-80 place-items-center rounded-lg border border-dashed border-red-200 bg-white/70 px-4">
          <div className="flex max-w-sm flex-col items-center text-center">
            <VideoOff className="h-9 w-9 text-red-500" />
            <p className="mt-3 text-sm font-black text-slate-700">
              {intl.formatMessage({ id: "meeting.history.error" })}
            </p>
            <button
              type="button"
              onClick={() => historyQuery.refetch()}
              className="mt-4 inline-flex h-10 cursor-pointer items-center gap-2 rounded-lg bg-[#0052CC] px-4 text-sm font-black text-white transition hover:bg-[#0C66E4]"
            >
              <RotateCcw className="h-4 w-4" />
              {intl.formatMessage({ id: "app.tryAgain" })}
            </button>
          </div>
        </div>
      ) : meetings.length === 0 ? (
        <div className="grid min-h-80 place-items-center rounded-lg border border-dashed border-slate-200 bg-white/70 px-4">
          <div className="max-w-sm text-center">
            <VideoOff className="mx-auto h-9 w-9 text-slate-400" />
            <p className="mt-3 text-sm font-black text-slate-700">
              {intl.formatMessage({ id: "meeting.history.emptyTitle" })}
            </p>
            <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
              {intl.formatMessage({ id: "meeting.history.emptyDescription" })}
            </p>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          {viewMode === MeetingHistoryViewMode.GRID ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
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

          <MeetingHistoryPagination
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
