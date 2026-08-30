"use client";

import {
  Crown,
  Loader2,
  MicOff,
  MoreVertical,
  Pin,
  Search,
  ShieldMinus,
  ShieldPlus,
  UserX,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import { useAppIntl } from "@/features/i18n/useAppIntl";
import {
  useMeetingParticipantsQuery,
  useRemoveMeetingParticipantMutation,
  useUpdateMeetingParticipantRoleMutation,
} from "../../../hooks/queries/use-meeting-queries";
import {
  MeetingParticipant,
  MeetingResponse,
  MeetingRole,
} from "../../../types/meeting.types";
import { canModerateMeeting } from "../../../utils/meeting.utils";
import { buildParticipantInitials } from "../meeting-room.utils";

interface MeetingParticipantsModalProps {
  connectedParticipantIds: Set<string>;
  meeting: MeetingResponse;
  onClose: () => void;
}

interface OpenParticipantMenu {
  userId: string;
  rect: DOMRect;
}

const PARTICIPANT_MENU_WIDTH = 208;
const PARTICIPANT_MENU_PADDING = 8;
const PARTICIPANT_MENU_ROW_HEIGHT = 40;

export function MeetingParticipantsModal({
  connectedParticipantIds,
  meeting,
  onClose,
}: MeetingParticipantsModalProps) {
  const intl = useAppIntl();
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [openMenu, setOpenMenu] = useState<OpenParticipantMenu | null>(null);
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
  const currentUserId = meeting.currentParticipant?.userId;
  const isCurrentUserPrimaryHost = currentUserId === meeting.hostId;
  const canCurrentUserModerate = canModerateMeeting(meeting);
  const participantsQuery = useMeetingParticipantsQuery(
    meeting.id,
    debouncedSearch,
    true,
  );
  const updateRole = useUpdateMeetingParticipantRoleMutation(
    meeting.id,
    meeting.joinToken,
  );
  const removeParticipant = useRemoveMeetingParticipantMutation(
    meeting.id,
    meeting.joinToken,
  );
  const participants = useMemo(
    () => participantsQuery.data?.data ?? [],
    [participantsQuery.data?.data],
  );
  const actionUserId =
    updateRole.variables?.userId ?? removeParticipant.variables ?? null;
  const isActionPending = updateRole.isPending || removeParticipant.isPending;

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
    }, 250);

    return () => window.clearTimeout(timeoutId);
  }, [searchInput]);

  useEffect(() => {
    const frameId = window.requestAnimationFrame(() => {
      setPortalTarget(document.body);
    });

    return () => window.cancelAnimationFrame(frameId);
  }, []);

  useEffect(() => {
    if (!openMenu) return;

    const closeMenu = () => setOpenMenu(null);

    window.addEventListener("resize", closeMenu);
    window.addEventListener("scroll", closeMenu, true);

    return () => {
      window.removeEventListener("resize", closeMenu);
      window.removeEventListener("scroll", closeMenu, true);
    };
  }, [openMenu]);

  const sortedParticipants = useMemo(
    () =>
      [...participants].sort((first, second) => {
        const firstRank = getRoleRank(first, meeting.hostId);
        const secondRank = getRoleRank(second, meeting.hostId);
        if (firstRank !== secondRank) return firstRank - secondRank;
        return getParticipantName(first).localeCompare(
          getParticipantName(second),
        );
      }),
    [meeting.hostId, participants],
  );

  const handleRoleChange = (userId: string, role: MeetingRole) => {
    updateRole.mutate(
      { userId, role },
      {
        onError: () =>
          toast.error(
            intl.formatMessage({ id: "meeting.room.participants.actionFailed" }),
          ),
      },
    );
    setOpenMenu(null);
  };

  const handleRemoveParticipant = (userId: string) => {
    removeParticipant.mutate(userId, {
      onError: () =>
        toast.error(
          intl.formatMessage({ id: "meeting.room.participants.actionFailed" }),
        ),
    });
    setOpenMenu(null);
  };

  const handleComingSoonAction = () => {
    toast.info(
      intl.formatMessage({ id: "meeting.room.participants.comingSoon" }),
    );
    setOpenMenu(null);
  };
  const activeMenuParticipant = openMenu
    ? sortedParticipants.find(
        (participant) => participant.userId === openMenu.userId,
      )
    : undefined;

  return (
    <div
      className="fixed inset-0 z-[60] grid place-items-center bg-slate-950/55 px-4 py-8"
      role="presentation"
      onClick={onClose}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="meeting-participants-title"
        className="flex max-h-[calc(100vh-4rem)] w-[min(30rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-lg border border-white/10 bg-[#111827] text-white shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
          <div>
            <h2
              id="meeting-participants-title"
              className="text-sm font-black text-white"
            >
              {intl.formatMessage({ id: "meeting.room.participants.title" })}
            </h2>
            <p className="mt-1 text-xs font-semibold text-slate-400">
              {intl.formatMessage(
                { id: "meeting.room.participants.count" },
                { count: participants.length },
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-md bg-white/10 text-slate-200 hover:bg-white/15"
            aria-label={intl.formatMessage({
              id: "meeting.room.participants.close",
            })}
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="border-b border-white/10 px-4 py-3">
          <label className="flex h-10 items-center gap-2 rounded-md border border-white/10 bg-white/[0.06] px-3 text-sm text-slate-200">
            <Search className="h-4 w-4 text-slate-400" />
            <input
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder={intl.formatMessage({
                id: "meeting.room.participants.search",
              })}
              className="min-w-0 flex-1 bg-transparent font-semibold outline-none placeholder:text-slate-500"
            />
          </label>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
          {participantsQuery.isLoading ? (
            <div className="flex items-center justify-center gap-2 px-4 py-8 text-sm font-bold text-slate-300">
              <Loader2 className="h-4 w-4 animate-spin text-blue-300" />
              {intl.formatMessage({
                id: "meeting.room.participants.loading",
              })}
            </div>
          ) : sortedParticipants.length ? (
            sortedParticipants.map((participant) => {
              const isSelf = participant.userId === currentUserId;
              const isHost =
                participant.userId === meeting.hostId ||
                participant.role === MeetingRole.HOST;
              const isCohost = participant.role === MeetingRole.COHOST;
              const isParticipantActionPending =
                isActionPending && actionUserId === participant.userId;
              const displayName = getParticipantName(participant);
              const email = participant.profile?.email;
              const avatarUrl = participant.profile?.avatarUrl;
              const initials = buildParticipantInitials(displayName);

              return (
                <article
                  key={participant.userId}
                  className="relative rounded-md px-2 py-2 hover:bg-white/[0.04]"
                >
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
                          <RoleTag
                            label={intl.formatMessage({
                              id: "meeting.room.participants.host",
                            })}
                            tone="host"
                          />
                        ) : null}
                        {!isHost && isCohost ? (
                          <RoleTag
                            label={intl.formatMessage({
                              id: "meeting.room.participants.cohost",
                            })}
                            tone="cohost"
                          />
                        ) : null}
                        {isSelf ? (
                          <RoleTag
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
                        connectedParticipantIds.has(participant.userId)
                          ? "bg-emerald-400"
                          : "bg-slate-600"
                      }`}
                      aria-label={intl.formatMessage({
                        id: connectedParticipantIds.has(participant.userId)
                          ? "meeting.room.participants.online"
                          : "meeting.room.participants.offline",
                      })}
                    />
                    {!isSelf ? (
                      <button
                        type="button"
                        disabled={isParticipantActionPending}
                        onClick={(event) => {
                          const rect =
                            event.currentTarget.getBoundingClientRect();
                          setOpenMenu((value) =>
                            value?.userId === participant.userId
                              ? null
                              : { userId: participant.userId, rect },
                          );
                        }}
                        className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-white/10 text-slate-200 hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-60"
                        aria-label={intl.formatMessage({
                          id: "meeting.room.participants.actions",
                        })}
                      >
                        {isParticipantActionPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <MoreVertical className="h-4 w-4" />
                        )}
                      </button>
                    ) : null}
                  </div>
                </article>
              );
            })
          ) : (
            <div className="px-4 py-8 text-center text-sm font-bold text-slate-400">
              {intl.formatMessage({ id: "meeting.room.participants.empty" })}
            </div>
          )}
        </div>
      </section>

      {portalTarget &&
      openMenu &&
      activeMenuParticipant &&
      activeMenuParticipant.userId !== currentUserId
        ? createPortal(
            <ParticipantActionsMenu
              intl={intl}
              canCurrentUserModerate={canCurrentUserModerate}
              isCurrentUserPrimaryHost={isCurrentUserPrimaryHost}
              meetingHostId={meeting.hostId}
              openMenu={openMenu}
              participant={activeMenuParticipant}
              currentUserId={currentUserId}
              onClose={() => setOpenMenu(null)}
              onComingSoonAction={handleComingSoonAction}
              onRoleChange={handleRoleChange}
              onRemoveParticipant={handleRemoveParticipant}
            />,
            portalTarget,
          )
        : null}
    </div>
  );
}

function RoleTag({
  label,
  tone,
}: {
  label: string;
  tone: "host" | "cohost" | "self";
}) {
  const className =
    tone === "host"
      ? "bg-amber-400/15 text-amber-200"
      : tone === "cohost"
        ? "bg-blue-400/15 text-blue-200"
        : "bg-emerald-400/15 text-emerald-200";

  return (
    <span className={`rounded px-1.5 py-0.5 text-[10px] font-black ${className}`}>
      {label}
    </span>
  );
}

function ParticipantActionsMenu({
  canCurrentUserModerate,
  currentUserId,
  intl,
  isCurrentUserPrimaryHost,
  meetingHostId,
  onClose,
  onComingSoonAction,
  onRemoveParticipant,
  onRoleChange,
  openMenu,
  participant,
}: {
  canCurrentUserModerate: boolean;
  currentUserId?: string;
  intl: ReturnType<typeof useAppIntl>;
  isCurrentUserPrimaryHost: boolean;
  meetingHostId: string;
  onClose: () => void;
  onComingSoonAction: () => void;
  onRemoveParticipant: (userId: string) => void;
  onRoleChange: (userId: string, role: MeetingRole) => void;
  openMenu: OpenParticipantMenu;
  participant: MeetingParticipant;
}) {
  const isSelf = participant.userId === currentUserId;
  const isHost =
    participant.userId === meetingHostId || participant.role === MeetingRole.HOST;
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
        <MenuButton
          icon={Pin}
          onClick={onComingSoonAction}
        >
          {intl.formatMessage({ id: "meeting.room.participants.pin" })}
        </MenuButton>
        <MenuButton
          icon={MicOff}
          onClick={onComingSoonAction}
        >
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

function getParticipantName(participant: MeetingParticipant) {
  return (
    participant.profile?.fullName ||
    participant.profile?.email ||
    participant.userId
  );
}

function getRoleRank(participant: MeetingParticipant, hostId: string) {
  if (participant.userId === hostId || participant.role === MeetingRole.HOST) {
    return 0;
  }
  if (participant.role === MeetingRole.COHOST) {
    return 1;
  }
  return 2;
}
