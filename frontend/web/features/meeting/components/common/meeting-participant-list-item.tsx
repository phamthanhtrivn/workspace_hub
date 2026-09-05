"use client";

import {
  Crown,
  Pin,
  PinOff,
  ShieldCheck,
  ShieldOff,
  UserMinus,
  Volume2,
  VolumeX,
} from "lucide-react";
import { useAppIntl } from "@/features/i18n/useAppIntl";
import type { MeetingParticipantListItemState } from "@/features/meeting/hooks/useMeetingParticipantsPanel";
import {
  MEETING_ROLE,
  type MeetingParticipantResponse,
  type MeetingParticipantRole,
} from "@/features/meeting/types/meeting.types";
import {
  MeetingIconDropdown,
  type MeetingIconDropdownItem,
} from "./meeting-icon-dropdown";
import { AvatarFallback } from "./avatar-fallback";

interface MeetingParticipantListItemProps {
  item: MeetingParticipantListItemState;
  isBusy: boolean;
  isAudioMutedForMe: boolean;
  isPinnedForMe: boolean;
  isPreferencePending: boolean;
  onRemove: (participant: MeetingParticipantResponse) => void;
  onRoleChange: (
    participant: MeetingParticipantResponse,
    role: MeetingParticipantRole,
  ) => void;
  onToggleAudioMute: (participantId: string) => void;
  onTogglePin: (participantId: string) => void;
}

export function MeetingParticipantListItem({
  item,
  isBusy,
  isAudioMutedForMe,
  isPinnedForMe,
  isPreferencePending,
  onRemove,
  onRoleChange,
  onToggleAudioMute,
  onTogglePin,
}: MeetingParticipantListItemProps) {
  const intl = useAppIntl();
  const actionItems: MeetingIconDropdownItem[] = [];

  if (!item.isSelf) {
    actionItems.push({
      id: isPinnedForMe ? "unpin-participant" : "pin-participant",
      label: intl.formatMessage({
        id: isPinnedForMe
          ? "meeting.participants.unpin"
          : "meeting.participants.pin",
      }),
      icon: isPinnedForMe ? PinOff : Pin,
      disabled: isPreferencePending,
      onSelect: () => onTogglePin(item.participant.userId),
    });
    actionItems.push({
      id: isAudioMutedForMe
        ? "unmute-participant-for-me"
        : "mute-participant-for-me",
      label: intl.formatMessage({
        id: isAudioMutedForMe
          ? "meeting.participants.unmuteForMe"
          : "meeting.participants.muteForMe",
      }),
      icon: isAudioMutedForMe ? Volume2 : VolumeX,
      disabled: isPreferencePending,
      onSelect: () => onToggleAudioMute(item.participant.userId),
    });
  }

  if (item.canPromoteToCohost) {
    actionItems.push({
      id: "make-cohost",
      label: intl.formatMessage({ id: "meeting.participants.makeCohost" }),
      icon: ShieldCheck,
      disabled: isBusy,
      onSelect: () => onRoleChange(item.participant, MEETING_ROLE.COHOST),
    });
  }

  if (item.canDemoteToParticipant) {
    actionItems.push({
      id: "make-participant",
      label: intl.formatMessage({
        id: "meeting.participants.makeParticipant",
      }),
      icon: ShieldOff,
      disabled: isBusy,
      onSelect: () => onRoleChange(item.participant, MEETING_ROLE.PARTICIPANT),
    });
  }

  if (item.canManageRole) {
    actionItems.push({
      id: "make-host",
      label: intl.formatMessage({ id: "meeting.participants.makeHost" }),
      icon: Crown,
      disabled: isBusy,
      onSelect: () => onRoleChange(item.participant, MEETING_ROLE.HOST),
    });
  }

  if (item.canRemove) {
    actionItems.push({
      id: "remove",
      label: intl.formatMessage({ id: "meeting.participants.remove" }),
      icon: UserMinus,
      disabled: isBusy,
      danger: true,
      onSelect: () => onRemove(item.participant),
    });
  }

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
          <AvatarFallback
            label={item.displayName}
            className="h-10 w-10 bg-slate-200/90"
            iconClassName="h-5 w-5 text-slate-400"
          />
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
          <span className="mt-1 block truncate text-xs font-semibold text-slate-400">
            {item.email}
          </span>
        </span>

        {item.roleLabelId ? (
          <span className="shrink-0 rounded-md bg-blue-500/14 px-2 py-1 text-[11px] font-black text-blue-100 ring-1 ring-blue-200/15">
            {intl.formatMessage({ id: item.roleLabelId })}
          </span>
        ) : null}

        <MeetingIconDropdown
          label={intl.formatMessage({ id: "meeting.participants.actions" })}
          items={actionItems}
        />
      </div>
    </article>
  );
}
