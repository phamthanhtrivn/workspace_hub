"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";
import { useAppIntl } from "@/features/i18n/useAppIntl";
import { MeetingHero } from "./common/meeting-hero";
import { MeetingActionTile } from "./common/meeting-action-tile";
import { MeetingJoinLinkModal } from "./common/meeting-join-link-modal";
import { MeetingPreviousView } from "./history/meeting-previous-view";
import {
  MeetingDashboardActionId,
  MeetingDashboardNavItemId,
  meetingDashboardActions,
} from "../types/meeting.constants";
import { MeetingSidebar } from "./meeting-sidebar";
import { useMeetingClock } from "../hooks/useMeetingClock";
import { MeetingFlowStep, MeetingPreJoinMode } from "../types/meeting.types";
import { MeetingPreJoin } from "./room/meeting-prejoin";
import { MeetingCreatingOverlay } from "./room/meeting-fullscreen-overlay";
import { useCreateInstantMeeting } from "../hooks/useCreateInstantMeeting";
import { usePreJoinMeetingDevices } from "../hooks/usePreJoinMeetingDevices";

export function MeetingLayout() {
  const intl = useAppIntl();
  const clock = useMeetingClock();
  const [flowStep, setFlowStep] = useState(MeetingFlowStep.DASHBOARD);
  const [activeNavItemId, setActiveNavItemId] = useState(
    MeetingDashboardNavItemId.OVERVIEW,
  );
  const [isJoinLinkModalOpen, setIsJoinLinkModalOpen] = useState(false);
  const isPreJoinOpen = flowStep === MeetingFlowStep.PREJOIN;
  const isOverviewActive =
    activeNavItemId === MeetingDashboardNavItemId.OVERVIEW;
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
                liveMeetingCount={2}
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
