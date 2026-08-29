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
  Copy,
  Link2,
  Loader2,
  MessageSquare,
  MonitorUp,
  PhoneOff,
  Settings,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useAppIntl } from "@/features/i18n/useAppIntl";
import {
  useEndMeetingMutation,
  useLeaveMeetingMutation,
  useUpdateMeetingAccessMutation,
} from "../../../hooks/queries/use-meeting-queries";
import { meetingRoutes } from "../../../types/meeting.constants";
import {
  MeetingDevicePreferences,
  MeetingResponse,
} from "../../../types/meeting.types";
import {
  getMeetingDevicePreferences,
  resolveMeetingJoinUrl,
  saveMeetingDevicePreferences,
} from "../../../utils/meeting.utils";

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
  const settingsRef = useRef<HTMLDivElement | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [hasCopiedLink, setHasCopiedLink] = useState(false);
  const [isDisconnectingForLeave, setIsDisconnectingForLeave] =
    useState(false);
  const [isDisconnectingForEnd, setIsDisconnectingForEnd] = useState(false);
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const updateAccess = useUpdateMeetingAccessMutation(meeting.id, joinToken);
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
  const joinUrl = resolveCurrentMeetingUrl(meeting);
  const allowJoinWithoutApproval =
    updateAccess.data?.data.allowJoinWithoutApproval ??
    meeting.allowJoinWithoutApproval;
  const isLeaving = leaveMeeting.isPending || isDisconnectingForLeave;
  const isEnding = endMeeting.isPending || isDisconnectingForEnd;
  const isRoomActionPending = isLeaving || isEnding;

  useEffect(() => {
    if (!isSettingsOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!settingsRef.current?.contains(event.target as Node)) {
        setIsSettingsOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [isSettingsOpen]);

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

  const handleCopyJoinLink = async () => {
    setSettingsError(null);
    try {
      await copyTextToClipboard(joinUrl);
      setHasCopiedLink(true);
      window.setTimeout(() => setHasCopiedLink(false), 1800);
    } catch {
      setSettingsError(
        intl.formatMessage({ id: "meeting.room.copyLinkFailed" }),
      );
    }
  };

  const handleAccessChange = (allowNextJoinWithoutApproval: boolean) => {
    setSettingsError(null);
    updateAccess.mutate(
      { allowJoinWithoutApproval: allowNextJoinWithoutApproval },
      {
        onError: () =>
          setSettingsError(
            intl.formatMessage({ id: "meeting.room.accessUpdateFailed" }),
          ),
      },
    );
  };

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

      <div className="relative" ref={settingsRef}>
        <button
          type="button"
          onClick={() => setIsSettingsOpen((value) => !value)}
          className="grid h-10 w-10 place-items-center rounded-lg bg-white/10 text-white hover:bg-white/10"
          aria-expanded={isSettingsOpen}
          aria-label={intl.formatMessage({ id: "meeting.room.settings" })}
        >
          <Settings className="h-4 w-4" />
        </button>

        {isSettingsOpen ? (
          <div className="absolute bottom-12 right-0 z-10 w-[min(22rem,calc(100vw-2rem))] rounded-lg border border-white/10 bg-[#111827] p-4 text-left shadow-2xl">
            <div className="flex items-center gap-2 text-sm font-black text-white">
              <Settings className="h-4 w-4 text-blue-300" />
              {intl.formatMessage({ id: "meeting.room.meetingSettings" })}
            </div>

            <div className="mt-4 space-y-2">
              <label className="text-xs font-bold uppercase text-slate-400">
                {intl.formatMessage({ id: "meeting.room.joinLink" })}
              </label>
              <div className="flex overflow-hidden rounded-md border border-white/10 bg-black/20">
                <div className="flex min-w-0 flex-1 items-center gap-2 px-3 text-xs font-semibold text-slate-200">
                  <Link2 className="h-4 w-4 shrink-0 text-blue-300" />
                  <span className="truncate">{joinUrl}</span>
                </div>
                <button
                  type="button"
                  onClick={handleCopyJoinLink}
                  className="grid h-10 w-10 shrink-0 place-items-center border-l border-white/10 text-white hover:bg-white/10"
                  aria-label={intl.formatMessage({
                    id: "meeting.room.copyJoinLink",
                  })}
                >
                  <Copy className="h-4 w-4" />
                </button>
              </div>
              <p className="text-xs font-semibold text-slate-400">
                {hasCopiedLink
                  ? intl.formatMessage({ id: "meeting.room.linkCopied" })
                  : intl.formatMessage({ id: "meeting.room.copyJoinLinkHelp" })}
              </p>
            </div>

            {canModerate ? (
              <div className="mt-4 rounded-md border border-white/10 bg-white/[0.04] p-3">
                <label className="flex cursor-pointer items-start justify-between gap-3">
                  <span className="block text-sm font-bold text-white">
                      {intl.formatMessage({
                        id: "meeting.room.allowWithoutApproval",
                      })}
                    </span>
                  <input
                    type="checkbox"
                    checked={allowJoinWithoutApproval}
                    disabled={updateAccess.isPending}
                    onChange={(event) =>
                      handleAccessChange(event.target.checked)
                    }
                    className="h-5 w-5 accent-blue-500"
                  />
                </label>
                {updateAccess.isPending ? (
                  <p className="mt-2 flex items-center gap-2 text-xs font-bold text-blue-200">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    {intl.formatMessage({
                      id: "meeting.room.updatingAccess",
                    })}
                  </p>
                ) : null}
              </div>
            ) : null}

            {settingsError ? (
              <p className="mt-3 text-xs font-bold text-red-300">
                {settingsError}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>

      <button
        type="button"
        disabled={isRoomActionPending}
        onClick={handleLeaveMeeting}
        className="flex h-10 items-center gap-2 rounded-lg bg-red-500 px-4 text-sm font-black text-white hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isLeaving ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <PhoneOff className="h-4 w-4" />
        )}
        {intl.formatMessage({
          id: isLeaving ? "meeting.room.leaving" : "meeting.room.leave",
        })}
      </button>

      {canModerate ? (
        <button
          type="button"
          disabled={isRoomActionPending}
          onClick={handleEndMeeting}
          className="flex h-10 items-center gap-2 rounded-lg bg-red-500/45 px-4 text-sm font-black text-white hover:bg-red-500/60 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isEnding ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {intl.formatMessage({
            id: isEnding
              ? "meeting.room.endingForEveryone"
              : "meeting.room.endForEveryone",
          })}
        </button>
      ) : null}
    </footer>
  );
}

function getInitialDeviceId(deviceId: AudioCaptureOptions["deviceId"]) {
  return typeof deviceId === "string" ? deviceId : undefined;
}

function getTrackDeviceId(track?: LocalAudioTrack | LocalVideoTrack) {
  return track?.mediaStreamTrack.getSettings().deviceId;
}

async function copyTextToClipboard(text: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textArea = document.createElement("textarea");
  textArea.value = text;
  textArea.style.position = "fixed";
  textArea.style.opacity = "0";
  document.body.append(textArea);
  textArea.select();
  document.execCommand("copy");
  textArea.remove();
}

function resolveCurrentMeetingUrl(meeting: MeetingResponse) {
  if (typeof window !== "undefined") {
    return window.location.href;
  }

  return resolveMeetingJoinUrl(meeting);
}
