"use client";

import { useCallback, useMemo, useState } from "react";
import { useParticipants } from "@livekit/components-react";
import {
  ChevronLeft,
  ChevronRight,
  Crown,
  Loader2,
  Search,
  ShieldCheck,
  ShieldOff,
  UserMinus,
} from "lucide-react";
import { useAppIntl } from "@/features/i18n/useAppIntl";
import {
  useMeetingParticipantActions,
  useMeetingParticipants,
} from "@/features/meeting/hooks/useMeetingParticipants";
import type {
  MeetingParticipantResponse,
  MeetingParticipantRole,
} from "@/features/meeting/types/meeting.types";
import { useAppSelector } from "@/store/store";
import {
  canRemoveMeetingParticipant,
  getInitials,
  getRoleLabelId,
} from "@/features/meeting/utils/meeting-room.utils";

interface MeetingParticipantsPanelProps {
  joinToken: string;
  meetingId: string;
  participantRole: MeetingParticipantRole;
}

function getParticipantDisplayName(participant: MeetingParticipantResponse) {
  return participant.profile?.fullName || participant.profile?.email || participant.userId;
}

export function MeetingParticipantsPanel({
  joinToken,
  participantRole,
}: MeetingParticipantsPanelProps) {
  const intl = useAppIntl();
  const authUser = useAppSelector((state) => state.auth);
  const liveParticipants = useParticipants();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const participantsQuery = useMeetingParticipants({
    joinToken,
    search,
    page,
    enabled: true,
  });
  const actions = useMeetingParticipantActions(joinToken);
  const participantPage = participantsQuery.data?.data;
  const participants = participantPage?.items ?? [];
  const hasParticipants = participants.length > 0;
  const totalPages = participantPage?.totalPages ?? 1;
  const shouldShowPagination = hasParticipants && totalPages > 1;
  const liveParticipantIds = useMemo(
    () => new Set(liveParticipants.map((participant) => participant.identity)),
    [liveParticipants],
  );
  const isBusy =
    actions.removeParticipant.isPending || actions.updateRole.isPending;

  const handleRemove = useCallback(
    (participant: MeetingParticipantResponse) => {
      const displayName = getParticipantDisplayName(participant);
      const confirmed = window.confirm(
        intl.formatMessage(
          { id: "meeting.participants.removeConfirm" },
          { name: displayName },
        ),
      );

      if (confirmed) {
        actions.removeParticipant.mutate(participant.userId);
      }
    },
    [actions.removeParticipant, intl],
  );

  const handleRoleChange = useCallback(
    (participant: MeetingParticipantResponse, role: MeetingParticipantRole) => {
      const displayName = getParticipantDisplayName(participant);
      const isHostTransfer = role === "HOST";
      const confirmed =
        !isHostTransfer ||
        window.confirm(
          intl.formatMessage(
            { id: "meeting.participants.transferHostConfirm" },
            { name: displayName },
          ),
        );

      if (confirmed) {
        actions.updateRole.mutate({ userId: participant.userId, role });
      }
    },
    [actions.updateRole, intl],
  );

  return (
    <div className="mt-4 flex min-h-0 flex-1 flex-col gap-3">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setPage(1);
          }}
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
          participants.map((participant) => {
            const displayName =
              participant.userId === authUser.userId
                ? authUser.fullName || authUser.email || getParticipantDisplayName(participant)
                : getParticipantDisplayName(participant);
            const avatarUrl =
              participant.userId === authUser.userId
                ? authUser.avatarUrl || participant.profile?.avatarUrl
                : participant.profile?.avatarUrl;
            const roleLabelId = getRoleLabelId(participant.role);
            const isSelf = participant.userId === authUser.userId;
            const canRemove = canRemoveMeetingParticipant({
              actorRole: participantRole,
              targetRole: participant.role,
              isSelf,
            });
            const canManageRole =
              participantRole === "HOST" &&
              !isSelf &&
              participant.role !== "HOST";
            const isOnline = liveParticipantIds.has(participant.userId);

            return (
              <article
                key={participant.id}
                className="rounded-lg bg-white/6 p-3 ring-1 ring-white/8"
              >
                <div className="flex items-center gap-3">
                  {avatarUrl ? (
                    <span
                      aria-label={displayName}
                      role="img"
                      className="h-10 w-10 shrink-0 rounded-full bg-cover bg-center"
                      style={{ backgroundImage: `url("${avatarUrl}")` }}
                    />
                  ) : (
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/12 text-xs font-black">
                      {getInitials(displayName)}
                    </span>
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="flex min-w-0 items-center gap-2">
                      <span className="block truncate text-sm font-black">
                        {displayName}
                      </span>
                      {isSelf ? (
                        <span className="shrink-0 rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-black uppercase text-slate-300">
                          {intl.formatMessage({ id: "meeting.room.participant.you" })}
                        </span>
                      ) : null}
                    </span>
                    <span className="mt-1 flex min-w-0 items-center gap-2">
                      <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-400" />
                      <span className="truncate text-xs font-semibold text-slate-400">
                        {intl.formatMessage({
                          id: isOnline
                            ? "meeting.participants.online"
                            : "meeting.participants.reconnecting",
                        })}
                      </span>
                    </span>
                  </span>
                  {roleLabelId ? (
                    <span className="shrink-0 rounded-md bg-blue-500/14 px-2 py-1 text-[11px] font-black text-blue-100 ring-1 ring-blue-200/15">
                      {intl.formatMessage({ id: roleLabelId })}
                    </span>
                  ) : null}
                </div>

                {canManageRole || canRemove ? (
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    {canManageRole && participant.role === "PARTICIPANT" ? (
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => handleRoleChange(participant, "COHOST")}
                        className="flex h-8 cursor-pointer items-center justify-center gap-1 rounded-md bg-white/10 px-2 text-xs font-black text-slate-200 transition hover:bg-blue-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <ShieldCheck className="h-3.5 w-3.5" />
                        {intl.formatMessage({ id: "meeting.participants.makeCohost" })}
                      </button>
                    ) : null}
                    {canManageRole && participant.role === "COHOST" ? (
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() =>
                          handleRoleChange(participant, "PARTICIPANT")
                        }
                        className="flex h-8 cursor-pointer items-center justify-center gap-1 rounded-md bg-white/10 px-2 text-xs font-black text-slate-200 transition hover:bg-slate-600 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <ShieldOff className="h-3.5 w-3.5" />
                        {intl.formatMessage({ id: "meeting.participants.makeParticipant" })}
                      </button>
                    ) : null}
                    {canManageRole ? (
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => handleRoleChange(participant, "HOST")}
                        className="flex h-8 cursor-pointer items-center justify-center gap-1 rounded-md bg-amber-500 px-2 text-xs font-black text-white transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <Crown className="h-3.5 w-3.5" />
                        {intl.formatMessage({ id: "meeting.participants.makeHost" })}
                      </button>
                    ) : null}
                    {canRemove ? (
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => handleRemove(participant)}
                        className="flex h-8 cursor-pointer items-center justify-center gap-1 rounded-md bg-white/10 px-2 text-xs font-black text-slate-200 transition hover:bg-red-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <UserMinus className="h-3.5 w-3.5" />
                        {intl.formatMessage({ id: "meeting.participants.remove" })}
                      </button>
                    ) : null}
                  </div>
                ) : null}
              </article>
            );
          })
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
