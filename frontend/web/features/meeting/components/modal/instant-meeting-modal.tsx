"use client";

import { Mic, MicOff, ShieldCheck, Video, VideoOff, X } from "lucide-react";
import { useAppIntl } from "@/features/i18n/useAppIntl";
import { useInstantMeetingSetup } from "../../hooks/useInstantMeetingSetup";

interface InstantMeetingModalProps {
  open: boolean;
  onClose: () => void;
}

export function InstantMeetingModal({
  open,
  onClose,
}: InstantMeetingModalProps) {
  const intl = useAppIntl();
  const {
    videoRef,
    previewStream,
    isCameraEnabled,
    isMicEnabled,
    isPreparingDevices,
    deviceError,
    allowJoinWithoutApproval,
    isCreatingMeeting,
    closeSetup,
    submitInstantMeeting,
    setAllowJoinWithoutApproval,
    toggleMic,
    toggleCamera,
  } = useInstantMeetingSetup({ open, onClose });

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/35 px-4 py-6"
      role="presentation"
    >
      <form
        onSubmit={submitInstantMeeting}
        className="w-full max-w-3xl overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl"
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              {intl.formatMessage({ id: "meeting.deviceSetup.title" })}
            </h2>
            <p className="mt-1 text-xs font-medium text-slate-500">
              {intl.formatMessage({ id: "meeting.deviceSetup.description" })}
            </p>
          </div>
          <button
            type="button"
            onClick={closeSetup}
            className="grid h-8 w-8 place-items-center rounded-md text-slate-500 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label={intl.formatMessage({ id: "app.close" })}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="grid gap-5 px-5 py-5 lg:grid-cols-[minmax(0,1fr)_280px]">
          <section className="space-y-3">
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

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={toggleMic}
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
                onClick={toggleCamera}
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
          </section>

          <aside className="space-y-3">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-start gap-3">
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-white text-blue-600 ring-1 ring-slate-200">
                  <ShieldCheck className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    {intl.formatMessage({
                      id: "meeting.deviceSetup.accessTitle",
                    })}
                  </h3>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    {intl.formatMessage({
                      id: "meeting.deviceSetup.accessDescription",
                    })}
                  </p>
                </div>
              </div>
            </div>

            <label className="flex items-start gap-3 rounded-md border border-slate-200 px-3 py-3">
              <input
                type="checkbox"
                checked={allowJoinWithoutApproval}
                onChange={(event) =>
                  setAllowJoinWithoutApproval(event.target.checked)
                }
                className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <span>
                <span className="block text-sm font-semibold text-slate-800">
                  {intl.formatMessage({ id: "meeting.allowWithoutApproval" })}
                </span>
                <span className="mt-1 block text-xs leading-5 text-slate-500">
                  {intl.formatMessage({
                    id: "meeting.allowWithoutApprovalHelp",
                  })}
                </span>
              </span>
            </label>
          </aside>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-5 py-4">
          <button
            type="button"
            onClick={closeSetup}
            className="h-9 rounded-md border border-slate-300 px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            {intl.formatMessage({ id: "app.cancel" })}
          </button>
          <button
            type="submit"
            disabled={isCreatingMeeting}
            className="h-9 rounded-md bg-blue-600 px-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isCreatingMeeting
              ? intl.formatMessage({ id: "meeting.creating" })
              : intl.formatMessage({ id: "meeting.createInstant" })}
          </button>
        </div>
      </form>
    </div>
  );
}
