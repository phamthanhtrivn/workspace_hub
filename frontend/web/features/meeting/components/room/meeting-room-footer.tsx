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
import { useMeetingUnreadMessageCount } from "@/features/meeting/hooks/useMeetingMessages";
import { useMeetingSocket } from "@/features/meeting/hooks/useMeetingSocket";
import { playNotificationSound } from "@/features/notification/utils/notification-alert.utils";
import { useAppSelector } from "@/store/store";
import type { ApiResponse } from "@/features/chat/types/chat.types";
import { meetingRoomControlItems } from "../../types/meeting.constants";
import { meetingKeys } from "../../types/meeting.query-keys";
import type {
  MeetingMessageResponse,
  MeetingUnreadMessageCountResponse,
  MeetingParticipantRole,
  MeetingPreJoinSettings,
} from "../../types/meeting.types";
import { MEETING_ROLE, MeetingRoomPanel } from "../../types/meeting.types";
import type {
  MeetingJoinRequestUpdatedPayload,
  MeetingMessageReadPayload,
} from "../../types/meeting-socket.types";
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
  const currentUserId = useAppSelector((state) => state.auth.userId);
  const queryClient = useQueryClient();
  const canManageAdmission = canManageMeetingAdmission(participantRole);
  const joinRequestCountQuery = useMeetingJoinRequestCount({
    joinToken,
    enabled: canManageAdmission,
  });
  const unreadMessageCountQuery = useMeetingUnreadMessageCount(joinToken);
  const pendingJoinRequestCount = joinRequestCountQuery.data?.data.total ?? 0;
  const unreadMessageCount = unreadMessageCountQuery.data?.data.count ?? 0;
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
  const updateUnreadMessageCount = useCallback(
    (getNextCount: (currentCount: number) => number) => {
      queryClient.setQueryData<ApiResponse<MeetingUnreadMessageCountResponse>>(
        meetingKeys.messageUnreadCount(joinToken),
        (current) => {
          const count = Math.max(0, getNextCount(current?.data.count ?? 0));

          if (!current) {
            return {
              success: true,
              data: { count },
            };
          }

          return {
            ...current,
            data: {
              ...current.data,
              count,
            },
          };
        },
      );
    },
    [joinToken, queryClient],
  );
  const markChatUnread = useCallback(
    (message: MeetingMessageResponse) => {
      if (message.meetingId !== meetingId) return;
      if (!currentUserId || message.senderId === currentUserId) return;
      if (activePanel === MeetingRoomPanel.CHAT) return;

      playNotificationSound();
      updateUnreadMessageCount((currentCount) => currentCount + 1);
    },
    [activePanel, currentUserId, meetingId, updateUnreadMessageCount],
  );
  const clearUnreadMessageCount = useCallback(
    (payload?: MeetingMessageReadPayload) => {
      if (payload) {
        if (payload.meetingId !== meetingId) return;
        if (payload.userId !== currentUserId) return;
      }

      updateUnreadMessageCount(() => 0);
    },
    [currentUserId, meetingId, updateUnreadMessageCount],
  );
  const togglePanel = useCallback(
    (panel: Exclude<MeetingRoomPanel, MeetingRoomPanel.NONE>) => {
      const nextPanel =
        activePanel === panel ? MeetingRoomPanel.NONE : panel;

      if (nextPanel === MeetingRoomPanel.CHAT) {
        clearUnreadMessageCount();
      }

      onPanelChange(nextPanel);
    },
    [activePanel, clearUnreadMessageCount, onPanelChange],
  );

  useMeetingSocket({
    meetingId,
    onJoinRequested: canManageAdmission ? playJoinRequestSound : undefined,
    onJoinRequestChanged: canManageAdmission
      ? invalidateJoinRequestCount
      : undefined,
    onMessageSent: markChatUnread,
    onMessageRead: clearUnreadMessageCount,
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
                  : control.id === MeetingRoomPanel.CHAT
                    ? unreadMessageCount
                    : undefined
              }
              onClick={() => {
                if (isPanelControl) {
                  togglePanel(control.id);
                }
              }}
            />
          );
        })}

        {participantRole === MEETING_ROLE.HOST && (
          <MeetingRoomControlButton
            label={intl.formatMessage({ id: "meeting.room.control.end" })}
            icon={PhoneOff}
            danger
            disabled={isEndPending}
            onClick={onEndForEveryone}
          />
        )}

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
