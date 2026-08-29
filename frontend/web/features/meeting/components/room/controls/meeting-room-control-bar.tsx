import {
  MediaDeviceMenu,
  TrackToggle,
  useLocalParticipant,
  useRoomContext,
} from "@livekit/components-react";
import { useRouter } from "next/navigation";
import type {
  AudioCaptureOptions,
  LocalAudioTrack,
  LocalVideoTrack,
  VideoCaptureOptions,
} from "livekit-client";
import { Track } from "livekit-client";
import {
  ChevronUp,
  MessageSquare,
  MonitorUp,
} from "lucide-react";
import { useCallback, useState } from "react";
import { useAppIntl } from "@/features/i18n/useAppIntl";
import {
  useEndMeetingMutation,
  useLeaveMeetingMutation,
} from "../../../hooks/queries/use-meeting-queries";
import { meetingRoutes } from "../../../constants/meeting-routes.constants";
import {
  MeetingDevicePreferences,
  MeetingResponse,
} from "../../../types/meeting.types";
import {
  getMeetingDevicePreferences,
  saveMeetingDevicePreferences,
} from "../../../utils/meeting.utils";
import { MeetingExitControls } from "./meeting-exit-controls";
import { MeetingSettingsMenu } from "./meeting-settings-menu";

interface MeetingRoomControlBarProps {
  canModerate: boolean;
  joinToken: string;
  meeting: MeetingResponse;
  audioCaptureOptions?: AudioCaptureOptions;
  videoCaptureOptions?: VideoCaptureOptions;
  onDeviceError: (error: Error) => void;
  onRoomExitReported: () => void;
}

export function MeetingRoomControlBar({
  canModerate,
  joinToken,
  meeting,
  audioCaptureOptions,
  videoCaptureOptions,
  onDeviceError,
  onRoomExitReported,
}: MeetingRoomControlBarProps) {
  const intl = useAppIntl();
  const router = useRouter();
  const room = useRoomContext();
  const [isDisconnectingForLeave, setIsDisconnectingForLeave] =
    useState(false);
  const [isDisconnectingForEnd, setIsDisconnectingForEnd] = useState(false);
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const leaveMeeting = useLeaveMeetingMutation(meeting.id, joinToken);
  const endMeeting = useEndMeetingMutation(meeting.id, joinToken);
  const {
    cameraTrack,
    isCameraEnabled,
    isMicrophoneEnabled,
    microphoneTrack,
  } = useLocalParticipant();
  const audioTrack = microphoneTrack?.track as LocalAudioTrack | undefined;
  const videoTrack = cameraTrack?.track as LocalVideoTrack | undefined;
  const audioDeviceId = getInitialDeviceId(audioCaptureOptions?.deviceId);
  const videoDeviceId = getInitialDeviceId(videoCaptureOptions?.deviceId);
  const isLeaving = leaveMeeting.isPending || isDisconnectingForLeave;
  const isEnding = endMeeting.isPending || isDisconnectingForEnd;
  const isRoomActionPending = isLeaving || isEnding;

  const persistDevicePreferences = useCallback(
    (updates: Partial<MeetingDevicePreferences>) => {
      const currentPreferences = getMeetingDevicePreferences(joinToken);
      saveMeetingDevicePreferences(joinToken, {
        ...currentPreferences,
        ...updates,
      });
    },
    [joinToken],
  );

  const handleMicrophoneChange = useCallback(
    (enabled: boolean, isUserInitiated: boolean) => {
      if (!isUserInitiated) return;

      persistDevicePreferences({
        isMicEnabled: enabled,
        micDeviceId: getTrackDeviceId(audioTrack) ?? audioDeviceId,
      });
    },
    [audioDeviceId, audioTrack, persistDevicePreferences],
  );

  const handleCameraChange = useCallback(
    (enabled: boolean, isUserInitiated: boolean) => {
      if (!isUserInitiated) return;

      persistDevicePreferences({
        isCameraEnabled: enabled,
        cameraDeviceId: getTrackDeviceId(videoTrack) ?? videoDeviceId,
      });
    },
    [persistDevicePreferences, videoDeviceId, videoTrack],
  );

  const handleAudioDeviceChange = useCallback(
    (_kind: MediaDeviceKind, deviceId: string) => {
      persistDevicePreferences({
        isMicEnabled: isMicrophoneEnabled,
        micDeviceId: deviceId,
      });
    },
    [isMicrophoneEnabled, persistDevicePreferences],
  );

  const handleVideoDeviceChange = useCallback(
    (_kind: MediaDeviceKind, deviceId: string) => {
      persistDevicePreferences({
        isCameraEnabled,
        cameraDeviceId: deviceId,
      });
    },
    [isCameraEnabled, persistDevicePreferences],
  );

  const handleLeaveMeeting = async () => {
    if (isRoomActionPending) return;

    setSettingsError(null);
    setIsDisconnectingForLeave(true);
    try {
      onRoomExitReported();
      await room.disconnect();
      await leaveMeeting.mutateAsync();
      router.replace(meetingRoutes.listPath);
    } catch {
      setSettingsError(
        intl.formatMessage({ id: "meeting.room.leaveFailed" }),
      );
    } finally {
      setIsDisconnectingForLeave(false);
    }
  };

  const handleEndMeeting = async () => {
    if (isRoomActionPending) return;

    setSettingsError(null);
    setIsDisconnectingForEnd(true);
    try {
      onRoomExitReported();
      await room.disconnect();
      await endMeeting.mutateAsync();
      router.replace(meetingRoutes.listPath);
    } catch {
      setSettingsError(
        intl.formatMessage({ id: "meeting.room.endFailed" }),
      );
    } finally {
      setIsDisconnectingForEnd(false);
    }
  };

  return (
    <footer className="flex flex-wrap items-center justify-center gap-2 border-t border-white/10 bg-black/25 px-4 py-3">
      <div className="flex overflow-hidden rounded-lg bg-white/10">
        <TrackToggle
          source={Track.Source.Microphone}
          captureOptions={audioCaptureOptions}
          onChange={handleMicrophoneChange}
          onDeviceError={onDeviceError}
          className="h-10 px-4 text-sm font-bold text-white hover:bg-white/10"
        >
          <span className="ml-2 hidden sm:inline">
            {intl.formatMessage({ id: "meeting.room.microphone" })}
          </span>
        </TrackToggle>
        <MediaDeviceMenu
          kind="audioinput"
          initialSelection={audioDeviceId}
          onActiveDeviceChange={handleAudioDeviceChange}
          requestPermissions
          tracks={{ audioinput: audioTrack }}
          className="grid h-10 w-10 place-items-center border-l border-white/10 text-white hover:bg-white/10"
        >
          <ChevronUp className="h-4 w-4" />
        </MediaDeviceMenu>
      </div>

      <div className="flex overflow-hidden rounded-lg bg-white/10">
        <TrackToggle
          source={Track.Source.Camera}
          captureOptions={videoCaptureOptions}
          onChange={handleCameraChange}
          onDeviceError={onDeviceError}
          className="h-10 px-4 text-sm font-bold text-white hover:bg-white/10"
        >
          <span className="ml-2 hidden sm:inline">
            {intl.formatMessage({ id: "meeting.room.camera" })}
          </span>
        </TrackToggle>
        <MediaDeviceMenu
          kind="videoinput"
          initialSelection={videoDeviceId}
          onActiveDeviceChange={handleVideoDeviceChange}
          requestPermissions
          tracks={{ videoinput: videoTrack }}
          className="grid h-10 w-10 place-items-center border-l border-white/10 text-white hover:bg-white/10"
        >
          <ChevronUp className="h-4 w-4" />
        </MediaDeviceMenu>
      </div>

      <TrackToggle
        source={Track.Source.ScreenShare}
        captureOptions={{ audio: true, selfBrowserSurface: "include" }}
        className="flex h-10 items-center gap-2 rounded-lg bg-white/10 px-4 text-sm font-bold text-white hover:bg-white/10"
      >
        <MonitorUp className="h-4 w-4" />
        <span className="hidden sm:inline">
          {intl.formatMessage({ id: "meeting.room.shareScreen" })}
        </span>
      </TrackToggle>

      <button
        type="button"
        className="flex h-10 items-center gap-2 rounded-lg bg-white/10 px-4 text-sm font-bold text-white hover:bg-white/10"
      >
        <MessageSquare className="h-4 w-4" />
        <span className="hidden sm:inline">
          {intl.formatMessage({ id: "meeting.room.chat" })}
        </span>
      </button>

      <MeetingSettingsMenu
        canModerate={canModerate}
        joinToken={joinToken}
        meeting={meeting}
        settingsError={settingsError}
        onSettingsErrorChange={setSettingsError}
      />

      <MeetingExitControls
        canModerate={canModerate}
        isEnding={isEnding}
        isLeaving={isLeaving}
        isRoomActionPending={isRoomActionPending}
        onEndMeeting={handleEndMeeting}
        onLeaveMeeting={handleLeaveMeeting}
      />
    </footer>
  );
}

function getInitialDeviceId(deviceId: AudioCaptureOptions["deviceId"]) {
  return typeof deviceId === "string" ? deviceId : undefined;
}

function getTrackDeviceId(track?: LocalAudioTrack | LocalVideoTrack) {
  return track?.mediaStreamTrack.getSettings().deviceId;
}
