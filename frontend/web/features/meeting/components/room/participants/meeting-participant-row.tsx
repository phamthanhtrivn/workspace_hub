"use client";

import { Loader2, MoreVertical } from "lucide-react";
import { useAppIntl } from "@/features/i18n/useAppIntl";
import { MeetingParticipant, MeetingRole } from "../../../types/meeting.types";
import { buildParticipantInitials } from "../meeting-room.utils";
import { getParticipantName } from "./participant-list.utils";
import { ParticipantRoleBadge } from "./participant-role-badge";

interface MeetingParticipantRowProps {
  connectedParticipantIds: Set<string>;
  currentUserId?: string;
  isActionPending: boolean;
  meetingHostId: string;
  onActionsButtonClick: (userId: string, rect: DOMRect) => void;
  participant: MeetingParticipant;
}

export function MeetingParticipantRow({
  connectedParticipantIds,
  currentUserId,
  isActionPending,
  meetingHostId,
  onActionsButtonClick,
  participant,
}: MeetingParticipantRowProps) {
  const intl = useAppIntl();
  const isSelf = participant.userId === currentUserId;
  const isHost =
    participant.userId === meetingHostId ||
    participant.role === MeetingRole.HOST;
  const isCohost = participant.role === MeetingRole.COHOST;
  const displayName = getParticipantName(participant);
  const email = participant.profile?.email;
  const avatarUrl = participant.profile?.avatarUrl;
  const initials = buildParticipantInitials(displayName);
  const isConnected = connectedParticipantIds.has(participant.userId);

  return (
    <article className="relative rounded-md px-2 py-2 hover:bg-white/[0.04]">
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full bg-blue-600 text-sm font-black text-white">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={displayName}
              className="h-full w-full object-cover"
            />
          ) : (
            initials
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 flex-wrap items-center gap-1.5">
            <p className="truncate text-sm font-black text-white">
              {displayName}
            </p>
            {isHost ? (
              <ParticipantRoleBadge
                label={intl.formatMessage({
                  id: "meeting.room.participants.host",
                })}
                tone="host"
              />
            ) : null}
            {!isHost && isCohost ? (
              <ParticipantRoleBadge
                label={intl.formatMessage({
                  id: "meeting.room.participants.cohost",
                })}
                tone="cohost"
              />
            ) : null}
            {isSelf ? (
              <ParticipantRoleBadge
                label={intl.formatMessage({
                  id: "meeting.room.participants.you",
                })}
                tone="self"
              />
            ) : null}
          </div>
          <p className="truncate text-xs font-semibold text-slate-400">
            {email || participant.userId}
          </p>
        </div>
        <span
          className={`h-2 w-2 rounded-full ${
            isConnected ? "bg-emerald-400" : "bg-slate-600"
          }`}
          aria-label={intl.formatMessage({
            id: isConnected
              ? "meeting.room.participants.online"
              : "meeting.room.participants.offline",
          })}
        />
        {!isSelf ? (
          <button
            type="button"
            disabled={isActionPending}
            onClick={(event) => {
              onActionsButtonClick(
                participant.userId,
                event.currentTarget.getBoundingClientRect(),
              );
            }}
            className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-white/10 text-slate-200 hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-60"
            aria-label={intl.formatMessage({
              id: "meeting.room.participants.actions",
            })}
          >
            {isActionPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <MoreVertical className="h-4 w-4" />
            )}
          </button>
        ) : null}
      </div>
    </article>
  );
}
