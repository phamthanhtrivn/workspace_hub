import { Mic, MicOff, Video, VideoOff } from "lucide-react";
import { useAppIntl } from "@/features/i18n/useAppIntl";

interface InstantMeetingDeviceTogglesProps {
  isMicEnabled: boolean;
  isCameraEnabled: boolean;
  onToggleMic: () => void;
  onToggleCamera: () => void;
}

export function InstantMeetingDeviceToggles({
  isMicEnabled,
  isCameraEnabled,
  onToggleMic,
  onToggleCamera,
}: InstantMeetingDeviceTogglesProps) {
  const intl = useAppIntl();

  return (
    <div className="grid grid-cols-2 gap-3">
      <button
        type="button"
        onClick={onToggleMic}
        className="flex h-11 items-center justify-center gap-2 rounded-md border border-slate-200 text-sm font-bold text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        {isMicEnabled ? (
          <Mic className="h-4 w-4 text-blue-600" />
        ) : (
          <MicOff className="h-4 w-4 text-slate-500" />
        )}
        <span>
          {intl.formatMessage({
            id: isMicEnabled
              ? "meeting.deviceSetup.micOn"
              : "meeting.deviceSetup.micOff",
          })}
        </span>
      </button>

      <button
        type="button"
        onClick={onToggleCamera}
        className="flex h-11 items-center justify-center gap-2 rounded-md border border-slate-200 text-sm font-bold text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        {isCameraEnabled ? (
          <Video className="h-4 w-4 text-blue-600" />
        ) : (
          <VideoOff className="h-4 w-4 text-slate-500" />
        )}
        <span>
          {intl.formatMessage({
            id: isCameraEnabled
              ? "meeting.deviceSetup.cameraOn"
              : "meeting.deviceSetup.cameraOffShort",
          })}
        </span>
      </button>
    </div>
  );
}
