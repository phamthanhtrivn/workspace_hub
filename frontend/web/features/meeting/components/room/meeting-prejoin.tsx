"use client";

import { useEffect, useRef } from "react";
import {
  Loader2,
  Mic,
  MicOff,
  Video,
  VideoOff,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { MeetingPreJoinMode } from "../../types/meeting.types";
import type {
  MeetingDeviceOption,
  MeetingPreJoinSettings,
} from "../../types/meeting.types";
import { MeetingFullscreenPortal } from "./meeting-fullscreen-overlay";
import { MeetingAutoAdmitToggle } from "../common/meeting-auto-admit-toggle";
import { MeetingDeviceSelect } from "../common/meeting-device-select";
import { MeetingParticipantChatToggle } from "../common/meeting-participant-chat-toggle";
import { MeetingButton } from "../ui/meeting-form-controls";
import { MeetingIconButton } from "../ui/meeting-icon-button";

interface MeetingPreJoinProps {
  mode?: MeetingPreJoinMode;
  settings: MeetingPreJoinSettings;
  onSettingsChange: (settings: MeetingPreJoinSettings) => void;
  cameras: MeetingDeviceOption[];
  microphones: MeetingDeviceOption[];
  previewStream: MediaStream | null;
  isPreviewLoading: boolean;
  permissionError: string | null;
  stopPreview: () => void;
  onCancel: () => void;
  onStart: () => void;
}

export function MeetingPreJoin({
  mode = MeetingPreJoinMode.CREATE,
  settings,
  onSettingsChange,
  cameras,
  microphones,
  previewStream,
  isPreviewLoading,
  permissionError,
  stopPreview,
  onCancel,
  onStart,
}: MeetingPreJoinProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const isCreateMode = mode === MeetingPreJoinMode.CREATE;

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
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") onCancel();
    }

    document.addEventListener("keydown", handleEscape);

    return () => {
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
              Instant meeting
            </p>
            <h2 className="truncate text-base font-black sm:text-lg">
              Check your audio and video
            </h2>
          </div>

          <MeetingIconButton
            label="Close"
            icon={X}
            onClick={onCancel}
            className="bg-white/8 text-slate-200 hover:bg-white/14"
          />
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
                      {settings.cameraEnabled
                        ? "Preparing your preview"
                        : "Camera is off"}
                    </p>
                    <p className="mt-1 max-w-sm text-sm font-semibold leading-6 text-slate-300">
                      {permissionError ??
                        "Turn on your camera or microphone to test your setup before joining."}
                    </p>
                  </div>
                </div>
              )}

              <div className="absolute left-4 top-4 rounded-md bg-black/45 px-3 py-1.5 text-xs font-black text-white backdrop-blur">
                Local preview
              </div>
            </div>

            <div className="flex shrink-0 flex-wrap items-center justify-center gap-3 border-t border-white/10 bg-[#0b1422] px-4 py-4">
              <MeetingButton
                type="button"
                tone={settings.microphoneEnabled ? "secondary" : "danger"}
                controlSize="lg"
                onClick={() =>
                  updateSettings({ microphoneEnabled: !settings.microphoneEnabled })
                }
                className="min-w-32"
              >
                {settings.microphoneEnabled ? (
                  <Mic className="h-5 w-5" />
                ) : (
                  <MicOff className="h-5 w-5" />
                )}
                {settings.microphoneEnabled ? "Mic on" : "Mic off"}
              </MeetingButton>

              <MeetingButton
                type="button"
                tone={settings.cameraEnabled ? "secondary" : "danger"}
                controlSize="lg"
                onClick={() =>
                  updateSettings({ cameraEnabled: !settings.cameraEnabled })
                }
                className="min-w-32"
              >
                {settings.cameraEnabled ? (
                  <Video className="h-5 w-5" />
                ) : (
                  <VideoOff className="h-5 w-5" />
                )}
                {settings.cameraEnabled ? "Camera on" : "Camera off"}
              </MeetingButton>
            </div>
          </section>

          <aside className="flex flex-col gap-4 rounded-lg border border-white/10 bg-white p-4 text-[#172B4D] shadow-[0_24px_80px_rgba(0,0,0,0.18)]">
            <div>
              <h3 className="text-lg font-black">
                Ready to start?
              </h3>
              <p className="mt-1 text-sm font-semibold leading-6 text-slate-500">
                Choose your devices and room settings before entering.
              </p>
            </div>

            <div className="grid gap-3">
              <MeetingDeviceSelect
                id="meeting-camera-device"
                label="Camera"
                value={settings.cameraDeviceId}
                devices={cameras}
                icon={Video}
                onChange={(cameraDeviceId) => updateSettings({ cameraDeviceId })}
              />
              <MeetingDeviceSelect
                id="meeting-microphone-device"
                label="Microphone"
                value={settings.microphoneDeviceId}
                devices={microphones}
                icon={Mic}
                onChange={(microphoneDeviceId) =>
                  updateSettings({ microphoneDeviceId })
                }
              />
            </div>

            {isCreateMode ? (
              <div className="grid gap-3">
                <MeetingAutoAdmitToggle
                  checked={settings.autoAdmin}
                  onCheckedChange={(checked) =>
                    updateSettings({ autoAdmin: checked })
                  }
                />
                <MeetingParticipantChatToggle
                  checked={settings.chatEnabled}
                  onCheckedChange={(checked) =>
                    updateSettings({ chatEnabled: checked })
                  }
                />
              </div>
            ) : null}

            <div className="mt-auto flex flex-col gap-3 pt-2">
              <MeetingButton
                type="button"
                tone="primary"
                controlSize="lg"
                onClick={onStart}
                className="w-full shadow-[0_16px_34px_rgba(0,82,204,0.28)] hover:-translate-y-0.5"
              >
                {isCreateMode ? "Start meeting" : "Join meeting"}
              </MeetingButton>
              <MeetingButton
                type="button"
                tone="outline"
                controlSize="md"
                onClick={onCancel}
                className="w-full"
              >
                Cancel
              </MeetingButton>
            </div>
          </aside>
        </main>
      </div>
    </MeetingFullscreenPortal>
  );
}
