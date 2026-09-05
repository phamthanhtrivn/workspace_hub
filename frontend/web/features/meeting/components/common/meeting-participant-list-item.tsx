"use client";

import {
  Crown,
  ShieldCheck,
  ShieldOff,
  UserMinus,
} from "lucide-react";
import { useAppIntl } from "@/features/i18n/useAppIntl";
import type { MeetingParticipantListItemState } from "@/features/meeting/hooks/useMeetingParticipantsPanel";
import {
  MEETING_ROLE,
  type MeetingParticipantResponse,
  type MeetingParticipantRole,
} from "@/features/meeting/types/meeting.types";
import { getInitials } from "@/features/meeting/utils/meeting-room.utils";

interface MeetingParticipantListItemProps {
  item: MeetingParticipantListItemState;
  isBusy: boolean;
  onRemove: (participant: MeetingParticipantResponse) => void;
  onRoleChange: (
    participant: MeetingParticipantResponse,
    role: MeetingParticipantRole,
  ) => void;
}

export function MeetingParticipantListItem({
  item,
  isBusy,
  onRemove,
  onRoleChange,
}: MeetingParticipantListItemProps) {
  const intl = useAppIntl();

  return (
    <article className="rounded-lg bg-white/6 p-3 ring-1 ring-white/8">
      <div className="flex items-center gap-3">
        {item.avatarUrl ? (
          <span
            aria-label={item.displayName}
            role="img"
            className="h-10 w-10 shrink-0 rounded-full bg-cover bg-center"
            style={{ backgroundImage: `url("${item.avatarUrl}")` }}
          />
        ) : (
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/12 text-xs font-black">
            {getInitials(item.displayName)}
          </span>
        )}

        <span className="min-w-0 flex-1">
          <span className="flex min-w-0 items-center gap-2">
            <span className="block truncate text-sm font-black">
              {item.displayName}
            </span>
            {item.isSelf ? (
              <span className="shrink-0 rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-black uppercase text-slate-300">
                {intl.formatMessage({ id: "meeting.room.participant.you" })}
              </span>
            ) : null}
          </span>
          <span className="mt-1 flex min-w-0 items-center gap-2">
            <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-400" />
            <span className="truncate text-xs font-semibold text-slate-400">
              {intl.formatMessage({
                id: item.isOnline
                  ? "meeting.participants.online"
                  : "meeting.participants.reconnecting",
              })}
            </span>
          </span>
        </span>

        {item.roleLabelId ? (
          <span className="shrink-0 rounded-md bg-blue-500/14 px-2 py-1 text-[11px] font-black text-blue-100 ring-1 ring-blue-200/15">
            {intl.formatMessage({ id: item.roleLabelId })}
          </span>
        ) : null}
      </div>

      {item.canManageRole || item.canRemove ? (
        <div className="mt-3 grid grid-cols-2 gap-2">
          {item.canPromoteToCohost ? (
            <button
              type="button"
              disabled={isBusy}
              onClick={() =>
                onRoleChange(item.participant, MEETING_ROLE.COHOST)
              }
              className="flex h-8 cursor-pointer items-center justify-center gap-1 rounded-md bg-white/10 px-2 text-xs font-black text-slate-200 transition hover:bg-blue-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              {intl.formatMessage({ id: "meeting.participants.makeCohost" })}
            </button>
          ) : null}
          {item.canDemoteToParticipant ? (
            <button
              type="button"
              disabled={isBusy}
              onClick={() =>
                onRoleChange(item.participant, MEETING_ROLE.PARTICIPANT)
              }
              className="flex h-8 cursor-pointer items-center justify-center gap-1 rounded-md bg-white/10 px-2 text-xs font-black text-slate-200 transition hover:bg-slate-600 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ShieldOff className="h-3.5 w-3.5" />
              {intl.formatMessage({
                id: "meeting.participants.makeParticipant",
              })}
            </button>
          ) : null}
          {item.canManageRole ? (
            <button
              type="button"
              disabled={isBusy}
              onClick={() => onRoleChange(item.participant, MEETING_ROLE.HOST)}
              className="flex h-8 cursor-pointer items-center justify-center gap-1 rounded-md bg-amber-500 px-2 text-xs font-black text-white transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Crown className="h-3.5 w-3.5" />
              {intl.formatMessage({ id: "meeting.participants.makeHost" })}
            </button>
          ) : null}
          {item.canRemove ? (
            <button
              type="button"
              disabled={isBusy}
              onClick={() => onRemove(item.participant)}
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
}
