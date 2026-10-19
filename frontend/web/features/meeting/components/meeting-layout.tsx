"use client";

import { useCallback, useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MeetingHero } from "./common/meeting-hero";
import { MeetingActionTile } from "./common/meeting-action-tile";
import { MeetingJoinLinkModal } from "./common/meeting-join-link-modal";
import { MeetingPreviousView } from "./history/meeting-previous-view";
import { MeetingRecordingsView } from "./recordings/meeting-recordings-view";
import { ScheduleMeetingModal } from "./schedule/schedule-meeting-modal";
import { UpcomingMeetingsView } from "./schedule/upcoming-meetings-view";
import { MeetingOverviewUpcoming } from "./overview/meeting-overview-upcoming";
import { MeetingOverviewRecent } from "./overview/meeting-overview-recent";
import {
  MeetingDashboardActionId,
  MeetingDashboardNavItemId,
  meetingDashboardActions,
} from "../types/meeting.constants";
import { MeetingSidebar } from "./meeting-sidebar";
import { useMeetingClock } from "../hooks/useMeetingClock";
import {
  MeetingFlowStep,
  MeetingPreJoinMode,
  type UpcomingMeetingItem,
} from "../types/meeting.types";
import { MeetingPreJoin } from "./room/meeting-prejoin";
import { MeetingCreatingOverlay } from "./room/meeting-fullscreen-overlay";
import { useCreateInstantMeeting } from "../hooks/useCreateInstantMeeting";
import { useMeetingSocket } from "../hooks/useMeetingSocket";
import { usePreJoinMeetingDevices } from "../hooks/usePreJoinMeetingDevices";
import { useUpcomingMeetings } from "../hooks/useScheduledMeetings";
import { meetingKeys } from "../types/meeting.query-keys";

const OVERVIEW_UPCOMING_LIMIT = 3;

export function MeetingLayout() {
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const clock = useMeetingClock();
  const [flowStep, setFlowStep] = useState(MeetingFlowStep.DASHBOARD);
  const [activeNavItemId, setActiveNavItemId] = useState(
    MeetingDashboardNavItemId.OVERVIEW,
  );
  const [isJoinLinkModalOpen, setIsJoinLinkModalOpen] = useState(false);
  const [isScheduleMeetingModalOpen, setIsScheduleMeetingModalOpen] =
    useState(false);
  const [editingScheduledMeeting, setEditingScheduledMeeting] =
    useState<UpcomingMeetingItem | null>(null);
  const isPreJoinOpen = flowStep === MeetingFlowStep.PREJOIN;
  const isOverviewActive =
    activeNavItemId === MeetingDashboardNavItemId.OVERVIEW;
  const isUpcomingActive =
    activeNavItemId === MeetingDashboardNavItemId.UPCOMING;
  const overviewEnabled = isOverviewActive && flowStep === MeetingFlowStep.DASHBOARD;
  const upcomingOverviewQuery = useUpcomingMeetings({
    page: 1,
    limit: OVERVIEW_UPCOMING_LIMIT,
    enabled: overviewEnabled,
    refetchOnWindowFocus: true,
  });
  const highlightedMeetingJoinToken = searchParams.get("meeting");
  const {
    settings: preJoinSettings,
    setSettings: setPreJoinSettings,
    reloadSettings,
    cameras,
    microphones,
    previewStream,
    isPreviewLoading,
    permissionError,
    stopPreview,
  } = usePreJoinMeetingDevices({ previewEnabled: isPreJoinOpen });
  const handleCreateStarted = useCallback(
    () => setFlowStep(MeetingFlowStep.CREATING),
    [],
  );
  const handleCreateSucceeded = useCallback(
    () => setFlowStep(MeetingFlowStep.DASHBOARD),
    [],
  );
  const handleCreateFailed = useCallback(
    () => setFlowStep(MeetingFlowStep.PREJOIN),
    [],
  );
  const { createMeeting } = useCreateInstantMeeting({
    skipJoinPrejoinAfterCreate: true,
    onCreating: handleCreateStarted,
    onCreated: handleCreateSucceeded,
    onError: handleCreateFailed,
  });

  const handleActionClick = (actionId: MeetingDashboardActionId) => {
    if (actionId === MeetingDashboardActionId.VIEW_RECORDINGS) {
      setActiveNavItemId(MeetingDashboardNavItemId.RECORDINGS);
      return;
    }
    if (actionId === MeetingDashboardActionId.JOIN_MEETING) {
      setIsJoinLinkModalOpen(true);
      return;
    }

    if (actionId === MeetingDashboardActionId.SCHEDULE_MEETING) {
      setEditingScheduledMeeting(null);
      setIsScheduleMeetingModalOpen(true);
      return;
    }

    if (actionId !== MeetingDashboardActionId.NEW_MEETING) return;

    reloadSettings();
    setFlowStep(MeetingFlowStep.PREJOIN);
  };

  const handleCancelPreJoin = () => {
    setFlowStep(MeetingFlowStep.DASHBOARD);
  };

  const handleStartMeeting = () => {
    createMeeting(preJoinSettings);
  };
  const handleScheduleMeeting = () => {
    setEditingScheduledMeeting(null);
    setIsScheduleMeetingModalOpen(true);
  };
  const handleEditScheduledMeeting = (meeting: UpcomingMeetingItem) => {
    setEditingScheduledMeeting(meeting);
    setIsScheduleMeetingModalOpen(true);
  };
  const handleCloseScheduleMeeting = () => {
    setIsScheduleMeetingModalOpen(false);
    setEditingScheduledMeeting(null);
  };
  const handleViewUpcomingMeetings = () => {
    setActiveNavItemId(MeetingDashboardNavItemId.UPCOMING);
  };
  const refreshMeetingOverview = useCallback(() => {
    void queryClient.invalidateQueries({
      queryKey: meetingKeys.upcomingRoot,
    });
    void queryClient.invalidateQueries({ queryKey: meetingKeys.historyRoot });
  }, [queryClient]);

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab === MeetingDashboardNavItemId.UPCOMING || tab === MeetingDashboardNavItemId.RECORDINGS) {
      const selectUpcomingTimer = window.setTimeout(() => {
        setActiveNavItemId(tab);
      }, 0);

      return () => window.clearTimeout(selectUpcomingTimer);
    }
  }, [searchParams]);

  useMeetingSocket({
    // onStatusUpdated also receives meeting-started events through the socket hook.
    onStatusUpdated: refreshMeetingOverview,
    onMeetingEnded: refreshMeetingOverview,
    onParticipantUpdated: refreshMeetingOverview,
    onParticipantJoined: refreshMeetingOverview,
    onParticipantLeft: refreshMeetingOverview,
    onParticipantRemoved: refreshMeetingOverview,
    onHostTransferred: refreshMeetingOverview,
    onReconnect: refreshMeetingOverview,
  });

  return (
    <div className="@container/meetings h-full min-h-0 min-w-0 w-full overflow-hidden bg-background text-foreground">
    <div className="flex h-full min-h-0 min-w-0 flex-col @min-[1120px]/meetings:flex-row">
      <MeetingSidebar
        activeItemId={activeNavItemId}
        onItemSelect={setActiveNavItemId}
      />

      <section className="@container/meeting-content flex min-h-0 min-w-0 flex-1 flex-col px-4 py-5 sm:px-6 lg:px-8">
        <ScrollArea key={activeNavItemId} className="min-h-0 flex-1" contentClassName="flex min-h-full flex-col" viewportProps={{ role: "region", "aria-label": "Meetings content" }}>
        <div className="flex min-w-0 w-full flex-1 flex-col gap-5">
          {isOverviewActive ? (
            <>
              <MeetingHero
                dateLabel={clock.dateLabel}
                timeLabel={clock.timeLabel}
                upcomingMeetingCount={
                  upcomingOverviewQuery.data?.data.total
                }
                onUpcomingClick={handleViewUpcomingMeetings}
              />

              <section
                className="grid min-w-0 grid-cols-1 gap-4 @min-[480px]/meeting-content:grid-cols-2 @min-[880px]/meeting-content:grid-cols-4"
                aria-label="Meeting actions"
              >
                {meetingDashboardActions.map((action) => (
                  <MeetingActionTile
                    key={action.id}
                    actionId={action.id}
                    title={action.title}
                    description={action.description}
                    tone={action.tone}
                    enabled={action.enabled}
                    onClick={() => handleActionClick(action.id)}
                  />
                ))}
              </section>
              <div className="grid min-w-0 items-start gap-8 @min-[900px]/meeting-content:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
                <MeetingOverviewUpcoming query={upcomingOverviewQuery} now={clock.now}
                  onViewAll={handleViewUpcomingMeetings} onSchedule={handleScheduleMeeting} onEdit={handleEditScheduledMeeting} />
                <MeetingOverviewRecent enabled={overviewEnabled} now={clock.now}
                  onViewHistory={() => setActiveNavItemId(MeetingDashboardNavItemId.PREVIOUS)} />
              </div>
            </>
          ) : isUpcomingActive ? (
            <UpcomingMeetingsView
              highlightJoinToken={highlightedMeetingJoinToken}
              onSchedule={handleScheduleMeeting}
              onEdit={handleEditScheduledMeeting}
            />
          ) : activeNavItemId === MeetingDashboardNavItemId.RECORDINGS ? (
            <MeetingRecordingsView />
          ) : (
            <MeetingPreviousView />
          )}
        </div>
        </ScrollArea>
      </section>
    </div>

      <MeetingJoinLinkModal
        open={isJoinLinkModalOpen}
        onClose={() => setIsJoinLinkModalOpen(false)}
        onOpenFailed={() => {
          toast.error("Could not open this meeting link.");
        }}
      />

      <ScheduleMeetingModal
        open={isScheduleMeetingModalOpen}
        meeting={editingScheduledMeeting}
        onClose={handleCloseScheduleMeeting}
      />

      {isPreJoinOpen && (
        <MeetingPreJoin
          mode={MeetingPreJoinMode.CREATE}
          settings={preJoinSettings}
          onSettingsChange={setPreJoinSettings}
          cameras={cameras}
          microphones={microphones}
          previewStream={previewStream}
          isPreviewLoading={isPreviewLoading}
          permissionError={permissionError}
          stopPreview={stopPreview}
          onCancel={handleCancelPreJoin}
          onStart={handleStartMeeting}
        />
      )}

      {flowStep === MeetingFlowStep.CREATING && <MeetingCreatingOverlay />}
    </div>
  );
}
