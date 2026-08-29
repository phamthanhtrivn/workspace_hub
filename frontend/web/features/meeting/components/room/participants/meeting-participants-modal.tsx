"use client";

import { Loader2, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import { useAppIntl } from "@/features/i18n/useAppIntl";
import {
  useMeetingParticipantsQuery,
  useRemoveMeetingParticipantMutation,
  useUpdateMeetingParticipantRoleMutation,
} from "../../../hooks/queries/use-meeting-queries";
import { MeetingResponse, MeetingRole } from "../../../types/meeting.types";
import { canModerateMeeting } from "../../../utils/meeting.utils";
import {
  OpenParticipantMenu,
  ParticipantActionsMenu,
} from "./participant-actions-menu";
import { MeetingParticipantRow } from "./meeting-participant-row";
import { getParticipantName, getRoleRank } from "./participant-list.utils";
import { ParticipantSearch } from "./participant-search";

interface MeetingParticipantsModalProps {
  connectedParticipantIds: Set<string>;
  meeting: MeetingResponse;
  onClose: () => void;
}

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

  const handleActionsButtonClick = (userId: string, rect: DOMRect) => {
    setOpenMenu((value) =>
      value?.userId === userId ? null : { userId, rect },
    );
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
          <ParticipantSearch
            value={searchInput}
            onChange={setSearchInput}
            placeholder={intl.formatMessage({
              id: "meeting.room.participants.search",
            })}
          />
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
              const isParticipantActionPending =
                isActionPending && actionUserId === participant.userId;

              return (
                <MeetingParticipantRow
                  key={participant.userId}
                  connectedParticipantIds={connectedParticipantIds}
                  currentUserId={currentUserId}
                  isActionPending={isParticipantActionPending}
                  meetingHostId={meeting.hostId}
                  participant={participant}
                  onActionsButtonClick={handleActionsButtonClick}
                />
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
