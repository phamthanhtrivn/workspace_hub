"use client";

import { useCallback, useMemo } from "react";
import { type LucideIcon, LogOut, Mic, MicOff, Video, VideoOff } from "lucide-react";
import { useTrackToggle } from "@livekit/components-react";
import { Track } from "livekit-client";
import { useAppIntl } from "@/features/i18n/useAppIntl";
import { meetingRoomControlItems } from "../../types/meeting.constants";
import type { MeetingPreJoinSettings } from "../../types/meeting.types";
import { MeetingRoomPanel } from "../../types/meeting.types";
import {
  loadMeetingDeviceSettings,
  saveMeetingDeviceSettings,
} from "../../utils/meeting-device-storage";
import { MeetingRoomControlButton } from "../common/meeting-room-control-button";

interface MeetingRoomFooterProps {
  activePanel: MeetingRoomPanel;
  settings: MeetingPreJoinSettings;
  onPanelChange: (panel: MeetingRoomPanel) => void;
  onLeave: () => void;
}

function isMeetingRoomPanelControl(
  controlId: (typeof meetingRoomControlItems)[number]["id"],
): controlId is Exclude<MeetingRoomPanel, MeetingRoomPanel.NONE> {
  return (
    controlId === MeetingRoomPanel.PARTICIPANTS ||
    controlId === MeetingRoomPanel.CHAT ||
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
  settings,
  onPanelChange,
  onLeave,
}: MeetingRoomFooterProps) {
  const intl = useAppIntl();

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
          const isPanelControl = isMeetingRoomPanelControl(control.id);
          const isActive = isPanelControl && activePanel === control.id;

          return (
            <MeetingRoomControlButton
              key={control.id}
              label={intl.formatMessage({ id: control.labelId })}
              icon={control.icon}
              active={isActive}
              disabled={!isPanelControl}
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

        <MeetingRoomControlButton
          label={intl.formatMessage({ id: "meeting.room.control.leave" })}
          icon={LogOut}
          danger
          onClick={onLeave}
        />
      </div>
    </footer>
  );
}
