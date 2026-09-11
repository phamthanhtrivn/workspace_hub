"use client";

import { useCallback, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAppIntl } from "@/features/i18n/useAppIntl";
import { MeetingHero } from "./common/meeting-hero";
import { MeetingActionTile } from "./common/meeting-action-tile";
import { MeetingJoinLinkModal } from "./common/meeting-join-link-modal";
import { MeetingPreviousView } from "./history/meeting-previous-view";
import { ScheduleMeetingModal } from "./schedule/schedule-meeting-modal";
import { UpcomingMeetingsView } from "./schedule/upcoming-meetings-view";
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

export function MeetingLayout() {
  const intl = useAppIntl();
  const queryClient = useQueryClient();
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
  const upcomingOverviewQuery = useUpcomingMeetings({ page: 1, limit: 1 });
  const isPreJoinOpen = flowStep === MeetingFlowStep.PREJOIN;
  const isOverviewActive =
    activeNavItemId === MeetingDashboardNavItemId.OVERVIEW;
  const isUpcomingActive =
    activeNavItemId === MeetingDashboardNavItemId.UPCOMING;
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
    onCreating: handleCreateStarted,
    onCreated: handleCreateSucceeded,
    onError: handleCreateFailed,
  });

  const handleActionClick = (actionId: MeetingDashboardActionId) => {
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
  const refreshUpcomingMeetings = useCallback(() => {
    void queryClient.invalidateQueries({
      queryKey: meetingKeys.upcomingRoot,
    });
  }, [queryClient]);

  useMeetingSocket({
    onMeetingStarted: refreshUpcomingMeetings,
  });

  return (
    <div className="flex h-full min-h-0 w-full flex-col overflow-hidden bg-[#f5f9fb] text-[#172B4D] xl:flex-row">
      <MeetingSidebar
        activeItemId={activeNavItemId}
        onItemSelect={setActiveNavItemId}
      />

      <section className="flex min-w-0 flex-1 flex-col overflow-y-auto px-4 py-5 sm:px-6 lg:px-8">
        <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-5">
          {isOverviewActive ? (
            <>
              <MeetingHero
                dateLabel={clock.dateLabel}
                timeLabel={clock.timeLabel}
                upcomingMeetingCount={
                  upcomingOverviewQuery.data?.data.total ?? 0
                }
                onUpcomingClick={handleViewUpcomingMeetings}
              />

              <section
                className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
                aria-label={intl.formatMessage({
                  id: "meeting.dashboard.actionsLabel",
                })}
              >
                {meetingDashboardActions.map((action) => (
                  <MeetingActionTile
                    key={action.id}
                    actionId={action.id}
                    titleId={action.titleId}
                    descriptionId={action.descriptionId}
                    tone={action.tone}
                    enabled={action.enabled}
                    onClick={() => handleActionClick(action.id)}
                  />
                ))}
              </section>
            </>
          ) : isUpcomingActive ? (
            <UpcomingMeetingsView
              onSchedule={handleScheduleMeeting}
              onEdit={handleEditScheduledMeeting}
            />
          ) : (
            <MeetingPreviousView />
          )}
        </div>
      </section>

      <MeetingJoinLinkModal
        open={isJoinLinkModalOpen}
        onClose={() => setIsJoinLinkModalOpen(false)}
        onOpenFailed={() => {
          toast.error(
            intl.formatMessage({ id: "meeting.joinModal.openFailed" }),
          );
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
