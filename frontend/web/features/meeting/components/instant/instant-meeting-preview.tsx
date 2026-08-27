import type { RefObject } from "react";
import { Video, VideoOff } from "lucide-react";
import { useAppIntl } from "@/features/i18n/useAppIntl";

interface InstantMeetingPreviewProps {
  videoRef: RefObject<HTMLVideoElement | null>;
  previewStream: MediaStream | null;
  isCameraEnabled: boolean;
  isPreparingDevices: boolean;
  deviceError: string | null;
}

export function InstantMeetingPreview({
  videoRef,
  previewStream,
  isCameraEnabled,
  isPreparingDevices,
  deviceError,
}: InstantMeetingPreviewProps) {
  const intl = useAppIntl();

  return (
    <>
      <div className="relative aspect-video overflow-hidden rounded-lg bg-slate-950">
        {isCameraEnabled && previewStream ? (
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-slate-300">
            <div className="grid h-14 w-14 place-items-center rounded-lg bg-white/10">
              {isCameraEnabled ? (
                <Video className="h-7 w-7" />
              ) : (
                <VideoOff className="h-7 w-7" />
              )}
            </div>
            <p className="text-sm font-semibold">
              {intl.formatMessage({
                id: isCameraEnabled
                  ? "meeting.deviceSetup.cameraPreparing"
                  : "meeting.deviceSetup.cameraOff",
              })}
            </p>
          </div>
        )}

        {isPreparingDevices ? (
          <div className="absolute left-3 top-3 rounded-md bg-slate-950/70 px-2 py-1 text-xs font-bold text-white">
            {intl.formatMessage({ id: "meeting.deviceSetup.preparing" })}
          </div>
        ) : null}
      </div>

      {deviceError ? (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800">
          {deviceError}
        </p>
      ) : null}
    </>
  );
}
