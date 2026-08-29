"use client";

import {
  Crown,
  MicOff,
  Pin,
  ShieldMinus,
  ShieldPlus,
  UserX,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { useAppIntl } from "@/features/i18n/useAppIntl";
import { MeetingParticipant, MeetingRole } from "../../../types/meeting.types";

export interface OpenParticipantMenu {
  userId: string;
  rect: DOMRect;
}

interface ParticipantActionsMenuProps {
  canCurrentUserModerate: boolean;
  currentUserId?: string;
  isCurrentUserPrimaryHost: boolean;
  meetingHostId: string;
  onClose: () => void;
  onComingSoonAction: () => void;
  onRemoveParticipant: (userId: string) => void;
  onRoleChange: (userId: string, role: MeetingRole) => void;
  openMenu: OpenParticipantMenu;
  participant: MeetingParticipant;
}

const PARTICIPANT_MENU_WIDTH = 208;
const PARTICIPANT_MENU_PADDING = 8;
const PARTICIPANT_MENU_ROW_HEIGHT = 40;

export function ParticipantActionsMenu({
  canCurrentUserModerate,
  currentUserId,
  isCurrentUserPrimaryHost,
  meetingHostId,
  onClose,
  onComingSoonAction,
  onRemoveParticipant,
  onRoleChange,
  openMenu,
  participant,
}: ParticipantActionsMenuProps) {
  const intl = useAppIntl();
  const isSelf = participant.userId === currentUserId;
  const isHost =
    participant.userId === meetingHostId ||
    participant.role === MeetingRole.HOST;
  const isCohost = participant.role === MeetingRole.COHOST;
  const isModerator = isHost || isCohost;
  const canManageRoles = isCurrentUserPrimaryHost && !isSelf && !isHost;
  const canRemoveParticipant =
    canCurrentUserModerate && !isSelf && !isModerator;
  const itemCount =
    2 + (canManageRoles ? 2 : 0) + (canRemoveParticipant ? 1 : 0);
  const position = getMenuPosition(openMenu.rect, itemCount);

  return (
    <div
      className="fixed inset-0 z-[70]"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="fixed overflow-hidden rounded-md border border-white/10 bg-[#0b1220] py-1 text-sm font-bold text-slate-100 shadow-2xl"
        style={{
          left: position.left,
          top: position.top,
          width: PARTICIPANT_MENU_WIDTH,
        }}
        onClick={(event) => event.stopPropagation()}
      >
        <MenuButton icon={Pin} onClick={onComingSoonAction}>
          {intl.formatMessage({ id: "meeting.room.participants.pin" })}
        </MenuButton>
        <MenuButton icon={MicOff} onClick={onComingSoonAction}>
          {intl.formatMessage({ id: "meeting.room.participants.mute" })}
        </MenuButton>
        {canManageRoles ? (
          <>
            <MenuButton
              icon={isCohost ? ShieldMinus : ShieldPlus}
              onClick={() =>
                onRoleChange(
                  participant.userId,
                  isCohost ? MeetingRole.PARTICIPANT : MeetingRole.COHOST,
                )
              }
            >
              {intl.formatMessage({
                id: isCohost
                  ? "meeting.room.participants.removeCohost"
                  : "meeting.room.participants.makeCohost",
              })}
            </MenuButton>
            <MenuButton
              icon={Crown}
              onClick={() => onRoleChange(participant.userId, MeetingRole.HOST)}
            >
              {intl.formatMessage({
                id: "meeting.room.participants.makeHost",
              })}
            </MenuButton>
          </>
        ) : null}
        {canRemoveParticipant ? (
          <MenuButton
            destructive
            icon={UserX}
            onClick={() => onRemoveParticipant(participant.userId)}
          >
            {intl.formatMessage({
              id: "meeting.room.participants.removeParticipant",
            })}
          </MenuButton>
        ) : null}
      </div>
    </div>
  );
}

function MenuButton({
  children,
  destructive,
  icon: Icon,
  onClick,
}: {
  children: ReactNode;
  destructive?: boolean;
  icon: LucideIcon;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex h-10 w-full items-center gap-2 px-3 text-left hover:bg-white/10 ${
        destructive ? "text-red-300" : "text-slate-100"
      }`}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span className="min-w-0 truncate">{children}</span>
    </button>
  );
}

function getMenuPosition(rect: DOMRect, itemCount: number) {
  const estimatedHeight =
    itemCount * PARTICIPANT_MENU_ROW_HEIGHT + PARTICIPANT_MENU_PADDING;
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const left = clamp(
    rect.right - PARTICIPANT_MENU_WIDTH,
    PARTICIPANT_MENU_PADDING,
    viewportWidth - PARTICIPANT_MENU_WIDTH - PARTICIPANT_MENU_PADDING,
  );
  const preferredTop = rect.bottom + PARTICIPANT_MENU_PADDING;
  const top =
    preferredTop + estimatedHeight > viewportHeight - PARTICIPANT_MENU_PADDING
      ? rect.top - estimatedHeight - PARTICIPANT_MENU_PADDING
      : preferredTop;

  return {
    left,
    top: clamp(
      top,
      PARTICIPANT_MENU_PADDING,
      viewportHeight - estimatedHeight - PARTICIPANT_MENU_PADDING,
    ),
  };
}

function clamp(value: number, min: number, max: number) {
  if (max < min) return min;
  return Math.min(Math.max(value, min), max);
}
