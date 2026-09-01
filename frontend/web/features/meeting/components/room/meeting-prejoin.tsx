"use client";

import { useEffect, useRef, useState } from "react";
import {
  Check,
  ChevronDown,
  Loader2,
  Mic,
  MicOff,
  ShieldCheck,
  Video,
  VideoOff,
  X,
} from "lucide-react";
import { useAppIntl } from "@/features/i18n/useAppIntl";
import { cn } from "@/lib/utils";
import { useMeetingDevicePreview } from "../../hooks/useMeetingDevicePreview";
import type { MeetingPreJoinSettings } from "../../types/meeting.types";
import { MeetingFullscreenPortal } from "./meeting-fullscreen-overlay";
import { MeetingDeviceSelect } from "../common/meeting-device-select";

interface MeetingPreJoinProps {
  settings: MeetingPreJoinSettings;
  onSettingsChange: (settings: MeetingPreJoinSettings) => void;
  onCancel: () => void;
  onStart: () => void;
}

export function MeetingPreJoin({
  settings,
  onSettingsChange,
  onCancel,
  onStart,
}: MeetingPreJoinProps) {
  const intl = useAppIntl();
  const videoRef = useRef<HTMLVideoElement>(null);
  const settingsRef = useRef<HTMLDivElement>(null);
  const [isRoomSettingsOpen, setIsRoomSettingsOpen] = useState(false);

  const {
    cameras,
    microphones,
    previewStream,
    isPreviewLoading,
    permissionError,
    stopPreview,
  } = useMeetingDevicePreview(settings);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.srcObject = previewStream;
  }, [previewStream]);

  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = originalOverflow;
      stopPreview();
    };
  }, [stopPreview]);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (
        settingsRef.current &&
        !settingsRef.current.contains(event.target as Node)
      ) {
        setIsRoomSettingsOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") onCancel();
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [onCancel]);

  const updateSettings = (nextSettings: Partial<MeetingPreJoinSettings>) => {
    onSettingsChange({
      ...settings,
      ...nextSettings,
    });
  };

  return (
    <MeetingFullscreenPortal>
      <div className="fixed inset-0 z-[100] flex min-h-[100dvh] flex-col overflow-y-auto bg-[#07111f] text-white">
        <header className="flex shrink-0 items-center justify-between border-b border-white/10 px-4 py-3 sm:px-6">
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-wide text-blue-200">
              {intl.formatMessage({ id: "meeting.prejoin.eyebrow" })}
            </p>
            <h2 className="truncate text-base font-black sm:text-lg">
              {intl.formatMessage({ id: "meeting.prejoin.title" })}
            </h2>
          </div>

          <button
            type="button"
            onClick={onCancel}
            aria-label={intl.formatMessage({ id: "app.close" })}
            className="grid h-10 w-10 place-items-center rounded-lg bg-white/8 text-slate-200 transition hover:bg-white/14 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <main className="grid min-h-0 flex-1 gap-5 px-4 py-5 lg:grid-cols-[minmax(0,1fr)_390px] lg:px-6">
          <section className="flex min-h-[360px] flex-col overflow-hidden rounded-lg border border-white/10 bg-black shadow-[0_24px_80px_rgba(0,0,0,0.28)]">
            <div className="relative min-h-0 flex-1 bg-[#101827]">
              {settings.cameraEnabled && previewStream ? (
                <video
                  ref={videoRef}
                  autoPlay
                  muted
                  playsInline
                  className="h-full min-h-[360px] w-full object-cover"
                />
              ) : (
                <div className="flex h-full min-h-[360px] flex-col items-center justify-center gap-4 bg-[radial-gradient(circle_at_top,#20304a,transparent_34%),#101827] px-6 text-center">
                  <span className="grid h-20 w-20 place-items-center rounded-full bg-white/10 text-slate-100 ring-1 ring-white/12">
                    {isPreviewLoading ? (
                      <Loader2 className="h-8 w-8 animate-spin" />
                    ) : settings.cameraEnabled ? (
                      <Video className="h-8 w-8" />
                    ) : (
                      <VideoOff className="h-8 w-8" />
                    )}
                  </span>
                  <div>
                    <p className="text-lg font-black">
                      {intl.formatMessage({
                        id: settings.cameraEnabled
                          ? "meeting.prejoin.previewWaiting"
                          : "meeting.prejoin.cameraOff",
                      })}
                    </p>
                    <p className="mt-1 max-w-sm text-sm font-semibold leading-6 text-slate-300">
                      {intl.formatMessage({
                        id:
                          permissionError ??
                          "meeting.prejoin.previewDescription",
                      })}
                    </p>
                  </div>
                </div>
              )}

              <div className="absolute left-4 top-4 rounded-md bg-black/45 px-3 py-1.5 text-xs font-black text-white backdrop-blur">
                {intl.formatMessage({ id: "meeting.prejoin.localPreview" })}
              </div>
            </div>

            <div className="flex shrink-0 flex-wrap items-center justify-center gap-3 border-t border-white/10 bg-[#0b1422] px-4 py-4">
              <button
                type="button"
                onClick={() =>
                  updateSettings({ microphoneEnabled: !settings.microphoneEnabled })
                }
                className={cn(
                  "flex h-14 min-w-32 items-center justify-center gap-2 rounded-lg px-4 text-sm font-black transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70",
                  settings.microphoneEnabled
                    ? "bg-white text-[#172B4D] hover:bg-slate-100"
                    : "bg-red-600 text-white hover:bg-red-500",
                )}
              >
                {settings.microphoneEnabled ? (
                  <Mic className="h-5 w-5" />
                ) : (
                  <MicOff className="h-5 w-5" />
                )}
                {intl.formatMessage({
                  id: settings.microphoneEnabled
                    ? "meeting.prejoin.micOn"
                    : "meeting.prejoin.micOff",
                })}
              </button>

              <button
                type="button"
                onClick={() =>
                  updateSettings({ cameraEnabled: !settings.cameraEnabled })
                }
                className={cn(
                  "flex h-14 min-w-32 items-center justify-center gap-2 rounded-lg px-4 text-sm font-black transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70",
                  settings.cameraEnabled
                    ? "bg-white text-[#172B4D] hover:bg-slate-100"
                    : "bg-red-600 text-white hover:bg-red-500",
                )}
              >
                {settings.cameraEnabled ? (
                  <Video className="h-5 w-5" />
                ) : (
                  <VideoOff className="h-5 w-5" />
                )}
                {intl.formatMessage({
                  id: settings.cameraEnabled
                    ? "meeting.prejoin.cameraOn"
                    : "meeting.prejoin.cameraOffShort",
                })}
              </button>
            </div>
          </section>

          <aside className="flex flex-col gap-4 rounded-lg border border-white/10 bg-white p-4 text-[#172B4D] shadow-[0_24px_80px_rgba(0,0,0,0.18)]">
            <div>
              <h3 className="text-lg font-black">
                {intl.formatMessage({ id: "meeting.prejoin.panelTitle" })}
              </h3>
              <p className="mt-1 text-sm font-semibold leading-6 text-slate-500">
                {intl.formatMessage({ id: "meeting.prejoin.panelDescription" })}
              </p>
            </div>

            <div className="grid gap-3">
              <MeetingDeviceSelect
                id="meeting-camera-device"
                label={intl.formatMessage({ id: "meeting.prejoin.camera" })}
                value={settings.cameraDeviceId}
                devices={cameras}
                icon={Video}
                onChange={(cameraDeviceId) => updateSettings({ cameraDeviceId })}
              />
              <MeetingDeviceSelect
                id="meeting-microphone-device"
                label={intl.formatMessage({ id: "meeting.prejoin.microphone" })}
                value={settings.microphoneDeviceId}
                devices={microphones}
                icon={Mic}
                onChange={(microphoneDeviceId) =>
                  updateSettings({ microphoneDeviceId })
                }
              />
            </div>

            <label className="group flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 bg-slate-50/80 p-3 transition hover:border-blue-200 hover:bg-blue-50/70">
              <input
                type="checkbox"
                checked={settings.autoAdmin}
                onChange={(event) =>
                  updateSettings({ autoAdmin: event.target.checked })
                }
                className="peer sr-only"
              />
              <span
                className={cn(
                  "mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md border transition",
                  settings.autoAdmin
                    ? "border-[#0052CC] bg-[#0052CC] text-white shadow-[0_8px_18px_rgba(0,82,204,0.28)]"
                    : "border-slate-300 bg-white text-transparent group-hover:border-[#0052CC]",
                )}
                aria-hidden="true"
              >
                <Check className="h-3.5 w-3.5 stroke-[3]" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2 text-sm font-black text-[#172B4D]">
                  <ShieldCheck className="h-4 w-4 text-[#0052CC]" />
                  {intl.formatMessage({
                    id: "meeting.prejoin.allowJoinWithoutApproval",
                  })}
                </span>
                <span className="mt-1 block text-xs font-semibold leading-5 text-slate-500">
                  {intl.formatMessage({
                    id: "meeting.prejoin.allowJoinWithoutApprovalDescription",
                  })}
                </span>
              </span>
            </label>

            <div className="mt-auto flex flex-col gap-3 pt-2">
              <button
                type="button"
                onClick={onStart}
                className="relative flex h-12 w-full items-center justify-center overflow-hidden rounded-lg bg-[#0052CC] px-5 text-sm font-black text-white shadow-[0_16px_34px_rgba(0,82,204,0.28)] transition hover:-translate-y-0.5 hover:bg-[#0747A6] hover:shadow-[0_20px_42px_rgba(0,82,204,0.34)] active:translate-y-0 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0052CC] focus-visible:ring-offset-2"
              >
                <span className="absolute inset-x-0 top-0 h-px bg-white/45" />
                {intl.formatMessage({ id: "meeting.prejoin.startMeeting" })}
              </button>
              <button
                type="button"
                onClick={onCancel}
                className="flex h-11 w-full items-center justify-center rounded-lg border border-slate-200 bg-white px-5 text-sm font-black text-slate-600 shadow-[inset_0_-1px_0_rgba(15,23,42,0.05)] transition hover:border-slate-300 hover:bg-slate-50 hover:text-[#172B4D] active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2"
              >
                {intl.formatMessage({ id: "app.cancel" })}
              </button>
            </div>
          </aside>
        </main>
      </div>
    </MeetingFullscreenPortal>
  );
}
