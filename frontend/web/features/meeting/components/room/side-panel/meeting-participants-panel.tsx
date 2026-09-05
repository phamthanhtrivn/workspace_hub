"use client";

import { ChevronLeft, ChevronRight, Loader2, Search } from "lucide-react";
import { MeetingParticipantListItem } from "@/features/meeting/components/common/meeting-participant-list-item";
import { useMeetingParticipantsPanel } from "@/features/meeting/hooks/useMeetingParticipantsPanel";
import type { MeetingParticipantRole } from "@/features/meeting/types/meeting.types";
import { useAppIntl } from "@/features/i18n/useAppIntl";

interface MeetingParticipantsPanelProps {
  joinToken: string;
  participantRole: MeetingParticipantRole;
}

export function MeetingParticipantsPanel({
  joinToken,
  participantRole,
}: MeetingParticipantsPanelProps) {
  const intl = useAppIntl();
  const {
    search,
    page,
    totalPages,
    participants,
    participantsQuery,
    hasParticipants,
    shouldShowPagination,
    isBusy,
    setPage,
    setSearch,
    handleRemove,
    handleRoleChange,
  } = useMeetingParticipantsPanel({ joinToken, participantRole });

  return (
    <div className="mt-4 flex min-h-0 flex-1 flex-col gap-3">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={intl.formatMessage({ id: "meeting.participants.search" })}
          className="h-10 w-full rounded-lg border border-white/10 bg-white/8 pl-9 pr-3 text-sm font-semibold text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-blue-300/50 focus:bg-white/10"
        />
      </div>

      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
        {participantsQuery.isLoading ? (
          <div className="flex h-40 items-center justify-center text-sm font-bold text-slate-400">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {intl.formatMessage({ id: "meeting.participants.loading" })}
          </div>
        ) : !hasParticipants ? (
          <div className="rounded-lg bg-white/6 p-4 text-center text-sm font-semibold leading-6 text-slate-400 ring-1 ring-white/8">
            {intl.formatMessage({ id: "meeting.participants.empty" })}
          </div>
        ) : (
          participants.map((participant) => (
            <MeetingParticipantListItem
              key={participant.participant.id}
              item={participant}
              isBusy={isBusy}
              onRemove={handleRemove}
              onRoleChange={handleRoleChange}
            />
          ))
        )}
      </div>

      {shouldShowPagination ? (
        <div className="mt-auto flex items-center justify-between gap-2 rounded-lg bg-white/6 px-2 py-2 text-xs font-black text-slate-300 ring-1 ring-white/8">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((current) => Math.max(1, current - 1))}
            className="grid h-8 w-8 cursor-pointer place-items-center rounded-md transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
            aria-label={intl.formatMessage({ id: "app.previous" })}
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span>
            {page} / {totalPages}
          </span>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() =>
              setPage((current) => Math.min(totalPages, current + 1))
            }
            className="grid h-8 w-8 cursor-pointer place-items-center rounded-md transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
            aria-label={intl.formatMessage({ id: "app.next" })}
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      ) : null}
    </div>
  );
}
