"use client";

import { useEffect, useRef, useState } from "react";
import { useAppIntl } from "@/features/i18n/useAppIntl";
import { MeetingHero } from "./common/meeting-hero";
import { MeetingActionTile } from "./common/meeting-action-tile";
import {
  MeetingDashboardActionId,
  meetingDashboardActions,
} from "../types/meeting.constants";
import { MeetingSidebar } from "./meeting-sidebar";
import { useMeetingClock } from "../hooks/useMeetingClock";
import {
  MeetingFlowStep,
  type MeetingPreJoinSettings,
} from "../types/meeting.types";
import { MeetingPreJoin } from "./room/meeting-prejoin";
import { MeetingCreatingOverlay } from "./room/meeting-fullscreen-overlay";

const defaultPreJoinSettings: MeetingPreJoinSettings = {
  cameraEnabled: true,
  microphoneEnabled: true,
  cameraDeviceId: "",
  microphoneDeviceId: "",
  autoAdmin: true,
};

function createTemporaryJoinToken() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID().slice(0, 8);
  }

  return Math.random().toString(36).slice(2, 10);
}

export function MeetingLayout() {
  const intl = useAppIntl();
  const clock = useMeetingClock();
  const creatingTimeoutRef = useRef<number | null>(null);
  const [flowStep, setFlowStep] = useState(MeetingFlowStep.DASHBOARD);
  const [preJoinSettings, setPreJoinSettings] =
    useState<MeetingPreJoinSettings>(defaultPreJoinSettings);

  useEffect(() => {
    return () => {
      if (creatingTimeoutRef.current !== null) {
        window.clearTimeout(creatingTimeoutRef.current);
      }
    };
  }, []);

  const handleActionClick = (actionId: MeetingDashboardActionId) => {
    if (actionId !== MeetingDashboardActionId.NEW_MEETING) return;

    setPreJoinSettings(defaultPreJoinSettings);
    setFlowStep(MeetingFlowStep.PREJOIN);
  };

  const handleCancelPreJoin = () => {
    setFlowStep(MeetingFlowStep.DASHBOARD);
  };

  const handleStartMeeting = () => {
    const joinToken = createTemporaryJoinToken();
    const roomUrl = `${window.location.origin}/meetings/${joinToken}`;
    const roomWindow = window.open(roomUrl, "_blank", "noopener,noreferrer");

    setFlowStep(MeetingFlowStep.CREATING);

    creatingTimeoutRef.current = window.setTimeout(() => {
      if (!roomWindow) {
        window.location.assign(roomUrl);
        return;
      }

      setFlowStep(MeetingFlowStep.DASHBOARD);
    }, 900);
  };

  return (
    <div className="flex h-full min-h-0 w-full flex-col overflow-hidden bg-[#f5f9fb] text-[#172B4D] xl:flex-row">
      <MeetingSidebar />

      <section className="flex min-w-0 flex-1 flex-col overflow-y-auto px-4 py-5 sm:px-6 lg:px-8">
        <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-5">
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
        </div>
      </section>

      {flowStep === MeetingFlowStep.PREJOIN ? (
        <MeetingPreJoin
          settings={preJoinSettings}
          onSettingsChange={setPreJoinSettings}
          onCancel={handleCancelPreJoin}
          onStart={handleStartMeeting}
        />
      ) : null}

      {flowStep === MeetingFlowStep.CREATING ? (
        <MeetingCreatingOverlay />
      ) : null}
    </div>
  );
}
