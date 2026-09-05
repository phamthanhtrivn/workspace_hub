"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import {
  RoomAudioRenderer,
  useConnectionState,
  useRoomContext,
} from "@livekit/components-react";
import { ChevronLeft, ChevronRight, Video } from "lucide-react";
import { toast } from "sonner";
import { useAppIntl } from "@/features/i18n/useAppIntl";
import { useMeetingParticipantGrid } from "@/features/meeting/hooks/useMeetingParticipantGrid";
import {
  useEndMeeting,
  useLeaveMeeting,
} from "@/features/meeting/hooks/useMeetingParticipants";
import { useMeetingSocket } from "@/features/meeting/hooks/useMeetingSocket";
import { useAppSelector } from "@/store/store";
import { MEETING_ROUTES } from "../../types/meeting.constants";
import { meetingKeys } from "../../types/meeting.query-keys";
import type {
  MeetingParticipantRole,
  MeetingPreJoinSettings,
} from "../../types/meeting.types";
import { MeetingRoomPanel } from "../../types/meeting.types";
import {
  formatElapsedTime,
  getRoomStatusLabelId,
} from "../../utils/meeting-room.utils";
import { MeetingParticipantTile } from "./meeting-participant-tile";
import { MeetingRoomFooter } from "./meeting-room-footer";
import { MeetingRoomDesktopSidePanel } from "./side-panel/meeting-room-desktop-side-panel";
import { MeetingRoomMobilePanelHeader } from "./side-panel/meeting-room-mobile-panel";

interface MeetingRoomContentProps {
  meetingId: string;
  joinToken: string;
  participantRole: MeetingParticipantRole;
  initialAutoAdmit: boolean;
  settings: MeetingPreJoinSettings;
}

export function MeetingRoomContent({
  meetingId,
  joinToken,
  participantRole,
  initialAutoAdmit,
  settings,
}: MeetingRoomContentProps) {
  const intl = useAppIntl();
  const router = useRouter();
  const queryClient = useQueryClient();
  const authUser = useAppSelector((state) => state.auth);
  const room = useRoomContext();
  const connectionState = useConnectionState();
  const [activePanel, setActivePanel] = useState(MeetingRoomPanel.NONE);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [autoAdmit, setAutoAdmit] = useState(initialAutoAdmit);
  const [currentParticipantRole, setCurrentParticipantRole] =
    useState(participantRole);
  const leaveMeetingMutation = useLeaveMeeting(joinToken);
  const endMeetingMutation = useEndMeeting(joinToken);
  const {
    canGoNext,
    canGoPrevious,
    currentParticipantPage,
    goToNextParticipantPage,
    goToPreviousParticipantPage,
    participantCount,
    participantGridClassName,
    participantTileFrameClassName,
    showParticipantPagination,
    totalParticipantPages,
    visibleCameraTracks,
  } = useMeetingParticipantGrid(activePanel);
  const handleStatusUpdated = useCallback(
    (payload: { meetingId: string; autoAdmit: boolean }) => {
      if (payload.meetingId === meetingId) {
        setAutoAdmit(payload.autoAdmit);
      }
    },
    [meetingId],
  );
  const invalidateMeetingRoomState = useCallback(() => {
    queryClient.invalidateQueries({
      queryKey: meetingKeys.participantsRoot(joinToken),
    });
    queryClient.invalidateQueries({
      queryKey: meetingKeys.access(joinToken),
    });
    queryClient.invalidateQueries({
      queryKey: meetingKeys.room(joinToken),
    });
  }, [joinToken, queryClient]);
  const leaveRoom = useCallback(() => {
    room.disconnect();
    router.push(MEETING_ROUTES.DASHBOARD);
  }, [room, router]);
  const handleMeetingEnded = useCallback(
    (payload: { meetingId: string; endedBy: string }) => {
      if (payload.meetingId !== meetingId) return;

      if (payload.endedBy !== authUser.userId) {
        toast.info(intl.formatMessage({ id: "meeting.room.endedByHost" }));
      }

      invalidateMeetingRoomState();
      leaveRoom();
    },
    [
      authUser.userId,
      intl,
      invalidateMeetingRoomState,
      leaveRoom,
      meetingId,
    ],
  );
  const handleParticipantUpdated = useCallback(
    (payload: { meetingId: string; userId: string; role: MeetingParticipantRole }) => {
      if (payload.meetingId !== meetingId) return;

      if (payload.userId === authUser.userId) {
        setCurrentParticipantRole(payload.role);
      }

      invalidateMeetingRoomState();
    },
    [authUser.userId, invalidateMeetingRoomState, meetingId],
  );
  const handleParticipantRemoved = useCallback(
    (payload: { meetingId: string; userId: string }) => {
      if (payload.meetingId !== meetingId) return;

      invalidateMeetingRoomState();

      if (payload.userId === authUser.userId) {
        toast.info(intl.formatMessage({ id: "meeting.room.removedByHost" }));
        leaveRoom();
      }
    },
    [
      authUser.userId,
      intl,
      invalidateMeetingRoomState,
      leaveRoom,
      meetingId,
    ],
  );
  const handleHostTransferred = useCallback(
    (payload: {
      meetingId: string;
      previousHostId: string;
      targetUserId: string;
    }) => {
      if (payload.meetingId !== meetingId) return;

      if (payload.targetUserId === authUser.userId) {
        setCurrentParticipantRole("HOST");
        toast.success(intl.formatMessage({ id: "meeting.room.youAreHost" }));
      }

      if (payload.previousHostId === authUser.userId) {
        setCurrentParticipantRole("PARTICIPANT");
      }

      invalidateMeetingRoomState();
    },
    [authUser.userId, intl, invalidateMeetingRoomState, meetingId],
  );

  useMeetingSocket({
    meetingId,
    onStatusUpdated: handleStatusUpdated,
    onMeetingEnded: handleMeetingEnded,
    onParticipantUpdated: handleParticipantUpdated,
    onParticipantRemoved: handleParticipantRemoved,
    onHostTransferred: handleHostTransferred,
  });

  useEffect(() => {
    const timerId = window.setInterval(() => {
      setElapsedSeconds((current) => current + 1);
    }, 1000);

    return () => window.clearInterval(timerId);
  }, []);

  const handleLeave = () => {
    leaveMeetingMutation.mutate(undefined, {
      onSuccess: () => {
        invalidateMeetingRoomState();
        leaveRoom();
      },
      onError: () => {
        toast.error(intl.formatMessage({ id: "meeting.room.leaveFailed" }));
      },
    });
  };

  const handleEndForEveryone = () => {
    const confirmed = window.confirm(
      intl.formatMessage({ id: "meeting.room.endConfirm" }),
    );

    if (!confirmed) return;

    endMeetingMutation.mutate(undefined, {
      onSuccess: () => {
        toast.success(intl.formatMessage({ id: "meeting.room.endSuccess" }));
        invalidateMeetingRoomState();
        leaveRoom();
      },
    });
  };

  const closePanel = () => setActivePanel(MeetingRoomPanel.NONE);

  return (
    <div className="fixed inset-0 z-[90] flex min-h-[100dvh] flex-col overflow-hidden bg-[#070b12] text-white">
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-white/10 bg-[#0d1420]/95 px-4 backdrop-blur sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-[#0052CC] shadow-[0_12px_28px_rgba(0,82,204,0.28)]">
            <Video className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <h1 className="truncate text-sm font-black sm:text-base">
              {intl.formatMessage({ id: "meeting.room.title" })}
            </h1>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <span className="hidden rounded-md bg-emerald-500/12 px-3 py-1.5 text-xs font-black text-emerald-200 ring-1 ring-emerald-300/15 sm:inline-flex">
            {intl.formatMessage({
              id: getRoomStatusLabelId(connectionState),
            })}
          </span>
          <span className="rounded-md bg-white/8 px-3 py-1.5 text-xs font-black text-slate-100 ring-1 ring-white/10">
            {formatElapsedTime(elapsedSeconds)}
          </span>
        </div>
      </header>

      <main className="flex min-h-0 flex-1">
        <section className="min-h-0 min-w-0 flex-1 overflow-y-auto px-4 py-4 [-ms-overflow-style:none] [scrollbar-width:none] sm:px-6 [&::-webkit-scrollbar]:hidden">
          <div className="flex min-h-full flex-col justify-start lg:justify-center">
            <div className={participantGridClassName}>
              {visibleCameraTracks.map((trackRef) => (
                <div
                  key={`${trackRef.participant.identity}-${trackRef.source}`}
                  className={participantTileFrameClassName}
                >
                  <MeetingParticipantTile
                    trackRef={trackRef}
                    isMainTile={false}
                  />
                </div>
              ))}
            </div>
            {showParticipantPagination ? (
              <div className="mt-6 shrink-0">
                <div className="mx-auto flex w-fit items-center justify-center gap-2 rounded-md bg-black/24 px-2 py-1.5 text-xs font-black text-slate-100 ring-1 ring-white/8 backdrop-blur">
                  <button
                    type="button"
                    disabled={!canGoPrevious}
                    onClick={goToPreviousParticipantPage}
                    className="cursor-pointer inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-200 transition hover:bg-white/10 hover:text-white active:scale-95 disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:bg-transparent disabled:hover:text-slate-200 sm:w-auto sm:gap-1.5 sm:px-2.5"
                    aria-label={intl.formatMessage({ id: "app.previous" })}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    <span className="hidden sm:inline">
                      {intl.formatMessage({ id: "app.previous" })}
                    </span>
                  </button>

                  <span className="min-w-14 rounded-md bg-white/6 px-2.5 py-1.5 text-center text-slate-300 ring-1 ring-white/6">
                    {currentParticipantPage} / {totalParticipantPages}
                  </span>

                  <button
                    type="button"
                    disabled={!canGoNext}
                    onClick={goToNextParticipantPage}
                    className="cursor-pointer inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-200 transition hover:bg-white/10 hover:text-white active:scale-95 disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:bg-transparent disabled:hover:text-slate-200 sm:w-auto sm:gap-1.5 sm:px-2.5"
                    aria-label={intl.formatMessage({ id: "app.next" })}
                  >
                    <span className="hidden sm:inline">
                      {intl.formatMessage({ id: "app.next" })}
                    </span>
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </section>

        <MeetingRoomDesktopSidePanel
          activePanel={activePanel}
          joinToken={joinToken}
          meetingId={meetingId}
          participantRole={currentParticipantRole}
          participantCount={participantCount}
          autoAdmit={autoAdmit}
          onAutoAdmitChange={setAutoAdmit}
          onClose={closePanel}
        />
      </main>

      <MeetingRoomFooter
        activePanel={activePanel}
        joinToken={joinToken}
        meetingId={meetingId}
        participantRole={currentParticipantRole}
        settings={settings}
        onPanelChange={setActivePanel}
        onLeave={handleLeave}
        onEndForEveryone={handleEndForEveryone}
        isLeavePending={leaveMeetingMutation.isPending}
        isEndPending={endMeetingMutation.isPending}
      />

      <MeetingRoomMobilePanelHeader
        activePanel={activePanel}
        joinToken={joinToken}
        meetingId={meetingId}
        participantRole={currentParticipantRole}
        participantCount={participantCount}
        autoAdmit={autoAdmit}
        onAutoAdmitChange={setAutoAdmit}
        onClose={closePanel}
      />

      <RoomAudioRenderer />
    </div>
  );
}
