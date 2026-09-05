"use client";

import { useCallback, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  type LucideIcon,
  LogOut,
  Mic,
  MicOff,
  PhoneOff,
  Video,
  VideoOff,
} from "lucide-react";
import { useTrackToggle } from "@livekit/components-react";
import { Track } from "livekit-client";
import { useAppIntl } from "@/features/i18n/useAppIntl";
import { useMeetingJoinRequestCount } from "@/features/meeting/hooks/useMeetingAdmission";
import { useMeetingSocket } from "@/features/meeting/hooks/useMeetingSocket";
import { playNotificationSound } from "@/features/notification/utils/notification-alert.utils";
import { meetingRoomControlItems } from "../../types/meeting.constants";
import { meetingKeys } from "../../types/meeting.query-keys";
import type {
  MeetingParticipantRole,
  MeetingPreJoinSettings,
} from "../../types/meeting.types";
import type { MeetingJoinRequestUpdatedPayload } from "../../types/meeting-socket.types";
import { MeetingRoomPanel } from "../../types/meeting.types";
import { canManageMeetingAdmission } from "../../utils/meeting-room.utils";
import {
  loadMeetingDeviceSettings,
  saveMeetingDeviceSettings,
} from "../../utils/meeting-device-storage";
import { MeetingRoomControlButton } from "../common/meeting-room-control-button";

interface MeetingRoomFooterProps {
  activePanel: MeetingRoomPanel;
  joinToken: string;
  meetingId: string;
  participantRole: MeetingParticipantRole;
  settings: MeetingPreJoinSettings;
  onPanelChange: (panel: MeetingRoomPanel) => void;
  onLeave: () => void;
  onEndForEveryone: () => void;
  isLeavePending?: boolean;
  isEndPending?: boolean;
}

function isMeetingRoomPanelControl(
  controlId: (typeof meetingRoomControlItems)[number]["id"],
): controlId is Exclude<MeetingRoomPanel, MeetingRoomPanel.NONE> {
  return (
    controlId === MeetingRoomPanel.PARTICIPANTS ||
    controlId === MeetingRoomPanel.CHAT ||
    controlId === MeetingRoomPanel.ADMISSION ||
    controlId === MeetingRoomPanel.SETTINGS
  );
}

function MeetingMediaToggleButton({
  source,
  settings,
  enabledLabelId,
  disabledLabelId,
  enabledIcon,
  disabledIcon,
}: {
  source: Track.Source.Camera | Track.Source.Microphone;
  settings: MeetingPreJoinSettings;
  enabledLabelId: string;
  disabledLabelId: string;
  enabledIcon: LucideIcon;
  disabledIcon: LucideIcon;
}) {
  const intl = useAppIntl();
  const selectedDeviceId =
    source === Track.Source.Camera
      ? settings.cameraDeviceId
      : settings.microphoneDeviceId;
  const captureOptions = useMemo(
    () => ({
      deviceId: selectedDeviceId ? { exact: selectedDeviceId } : undefined,
    }),
    [selectedDeviceId],
  );
  const handleChange = useCallback(
    (enabled: boolean, isUserInitiated: boolean) => {
      if (!isUserInitiated) return;

      const storedSettings = loadMeetingDeviceSettings();

      saveMeetingDeviceSettings({
        ...storedSettings,
        cameraEnabled:
          source === Track.Source.Camera
            ? enabled
            : storedSettings.cameraEnabled,
        microphoneEnabled:
          source === Track.Source.Microphone
            ? enabled
            : storedSettings.microphoneEnabled,
      });
    },
    [source],
  );
  const { enabled, pending, buttonProps } = useTrackToggle({
    source,
    captureOptions,
    onChange: handleChange,
  });

  return (
    <MeetingRoomControlButton
      label={intl.formatMessage({
        id: enabled ? enabledLabelId : disabledLabelId,
      })}
      icon={enabled ? enabledIcon : disabledIcon}
      active={enabled}
      disabled={pending}
      onClick={buttonProps.onClick}
    />
  );
}

export function MeetingRoomFooter({
  activePanel,
  joinToken,
  meetingId,
  participantRole,
  settings,
  onPanelChange,
  onLeave,
  onEndForEveryone,
  isLeavePending = false,
  isEndPending = false,
}: MeetingRoomFooterProps) {
  const intl = useAppIntl();
  const queryClient = useQueryClient();
  const canManageAdmission = canManageMeetingAdmission(participantRole);
  const joinRequestCountQuery = useMeetingJoinRequestCount({
    joinToken,
    enabled: canManageAdmission,
  });
  const pendingJoinRequestCount = joinRequestCountQuery.data?.data.total ?? 0;
  const invalidateJoinRequestCount = useCallback(
    (payload: MeetingJoinRequestUpdatedPayload) => {
      if (payload.meetingId !== meetingId) return;

      queryClient.invalidateQueries({
        queryKey: meetingKeys.joinRequestCount(joinToken),
      });
    },
    [joinToken, meetingId, queryClient],
  );
  const playJoinRequestSound = useCallback(
    (payload: MeetingJoinRequestUpdatedPayload) => {
      if (payload.meetingId !== meetingId) return;

      playNotificationSound();
    },
    [meetingId],
  );

  useMeetingSocket({
    meetingId: canManageAdmission ? meetingId : null,
    onJoinRequested: canManageAdmission ? playJoinRequestSound : undefined,
    onJoinRequestChanged: canManageAdmission
      ? invalidateJoinRequestCount
      : undefined,
  });

  return (
    <footer className="flex shrink-0 items-center justify-center border-t border-white/10 bg-[#0d1420]/95 px-3 py-3 backdrop-blur">
      <div className="flex max-w-full items-center gap-2 overflow-x-auto">
        <MeetingMediaToggleButton
          source={Track.Source.Microphone}
          settings={settings}
          enabledLabelId="meeting.room.control.mute"
          disabledLabelId="meeting.room.control.unmute"
          enabledIcon={Mic}
          disabledIcon={MicOff}
        />
        <MeetingMediaToggleButton
          source={Track.Source.Camera}
          settings={settings}
          enabledLabelId="meeting.room.control.stopVideo"
          disabledLabelId="meeting.room.control.startVideo"
          enabledIcon={Video}
          disabledIcon={VideoOff}
        />

        {meetingRoomControlItems.slice(2).map((control) => {
          if (control.id === MeetingRoomPanel.ADMISSION && !canManageAdmission) {
            return null;
          }

          const isPanelControl = isMeetingRoomPanelControl(control.id);
          const isActive = isPanelControl && activePanel === control.id;

          return (
            <MeetingRoomControlButton
              key={control.id}
              label={intl.formatMessage({ id: control.labelId })}
              icon={control.icon}
              active={isActive}
              disabled={!isPanelControl}
              badgeCount={
                control.id === MeetingRoomPanel.ADMISSION
                  ? pendingJoinRequestCount
                  : undefined
              }
              onClick={() => {
                if (isPanelControl) {
                  onPanelChange(
                    activePanel === control.id ? MeetingRoomPanel.NONE : control.id,
                  );
                }
              }}
            />
          );
        })}

        {participantRole === "HOST" ? (
          <MeetingRoomControlButton
            label={intl.formatMessage({ id: "meeting.room.control.end" })}
            icon={PhoneOff}
            danger
            disabled={isEndPending}
            onClick={onEndForEveryone}
          />
        ) : null}

        <MeetingRoomControlButton
          label={intl.formatMessage({ id: "meeting.room.control.leave" })}
          icon={LogOut}
          danger
          disabled={isLeavePending}
          onClick={onLeave}
        />
      </div>
    </footer>
  );
}
