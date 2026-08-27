import {
  DisconnectButton,
  MediaDeviceMenu,
  TrackToggle,
} from "@livekit/components-react";
import { Track } from "livekit-client";
import {
  ChevronUp,
  MessageSquare,
  MonitorUp,
  PhoneOff,
  Settings,
} from "lucide-react";
import { useAppIntl } from "@/features/i18n/useAppIntl";

interface MeetingRoomControlBarProps {
  isHost: boolean;
}

export function MeetingRoomControlBar({ isHost }: MeetingRoomControlBarProps) {
  const intl = useAppIntl();

  return (
    <footer className="flex flex-wrap items-center justify-center gap-2 border-t border-white/10 bg-black/25 px-4 py-3">
      <div className="flex overflow-hidden rounded-lg bg-white/10">
        <TrackToggle
          source={Track.Source.Microphone}
          className="h-10 px-4 text-sm font-bold text-white hover:bg-white/10"
        >
          <span className="ml-2 hidden sm:inline">
            {intl.formatMessage({ id: "meeting.room.microphone" })}
          </span>
        </TrackToggle>
        <MediaDeviceMenu
          kind="audioinput"
          className="grid h-10 w-10 place-items-center border-l border-white/10 text-white hover:bg-white/10"
        >
          <ChevronUp className="h-4 w-4" />
        </MediaDeviceMenu>
      </div>

      <div className="flex overflow-hidden rounded-lg bg-white/10">
        <TrackToggle
          source={Track.Source.Camera}
          className="h-10 px-4 text-sm font-bold text-white hover:bg-white/10"
        >
          <span className="ml-2 hidden sm:inline">
            {intl.formatMessage({ id: "meeting.room.camera" })}
          </span>
        </TrackToggle>
        <MediaDeviceMenu
          kind="videoinput"
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

      <button
        type="button"
        className="grid h-10 w-10 place-items-center rounded-lg bg-white/10 text-white hover:bg-white/10"
        aria-label={intl.formatMessage({ id: "meeting.room.settings" })}
      >
        <Settings className="h-4 w-4" />
      </button>

      <DisconnectButton className="flex h-10 items-center gap-2 rounded-lg bg-red-500 px-4 text-sm font-black text-white hover:bg-red-600">
        <PhoneOff className="h-4 w-4" />
        {intl.formatMessage({ id: "meeting.room.leave" })}
      </DisconnectButton>

      {isHost ? (
        <button
          type="button"
          disabled
          className="h-10 rounded-lg bg-red-500/45 px-4 text-sm font-black text-white opacity-70"
          title={intl.formatMessage({ id: "meeting.room.endDisabled" })}
        >
          {intl.formatMessage({ id: "meeting.room.endForEveryone" })}
        </button>
      ) : null}
    </footer>
  );
}
