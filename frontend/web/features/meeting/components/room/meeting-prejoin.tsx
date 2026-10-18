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

import { MeetingPreJoinMode } from "../../types/meeting.types";
import type {
  MeetingDeviceOption,
  MeetingPreJoinSettings,
} from "../../types/meeting.types";
import { DialogSurface } from "@/components/ui/dialog";
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

  useEffect(() => () => stopPreview(), [stopPreview]);



  const updateSettings = (nextSettings: Partial<MeetingPreJoinSettings>) => {
    onSettingsChange({
      ...settings,
      ...nextSettings,
    });
  };

  return (
    <DialogSurface onClose={onCancel} aria-label="Meeting device preview">
      <div className="fixed inset-0 z-[100] flex h-dvh min-h-0 flex-col overflow-y-auto bg-card text-foreground">
        <header className="flex shrink-0 items-center justify-between border-b border-border/10 px-4 py-3 sm:px-6">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-info-content">
              Instant meeting
            </p>
            <h2 className="truncate text-section-title font-semibold sm:text-section-title">
              Check your audio and video
            </h2>
          </div>

          <MeetingIconButton
            label="Close"
            icon={X}
            onClick={onCancel}
            className="bg-accent text-muted-foreground hover:bg-accent"
          />
        </header>

        <main className="grid min-h-0 flex-1 gap-5 px-4 py-5 lg:grid-cols-[minmax(0,1fr)_390px] lg:px-6">
          <section className="flex min-h-[min(240px,40dvh)] flex-col overflow-hidden rounded-lg border border-border bg-overlay">
            <div className="relative min-h-0 flex-1 bg-media-background text-media-foreground">
              {settings.cameraEnabled && previewStream ? (
                <video
                  ref={videoRef}
                  autoPlay
                  muted
                  playsInline
                  className="h-full min-h-[min(240px,40dvh)] w-full object-cover"
                />
              ) : (
                <div className="flex h-full min-h-[min(240px,40dvh)] flex-col items-center justify-center gap-4 bg-[radial-gradient(circle_at_top,var(--media-background),transparent_34%),var(--media-background)] px-6 text-center">
                  <span className="grid h-20 w-20 place-items-center rounded-full bg-accent text-muted-foreground ring-1 ring-border/12">
                    {isPreviewLoading ? (
                      <Loader2 className="h-8 w-8 animate-spin" />
                    ) : settings.cameraEnabled ? (
                      <Video className="h-8 w-8" />
                    ) : (
                      <VideoOff className="h-8 w-8" />
                    )}
                  </span>
                  <div>
                    <p className="text-lg font-semibold">
                      {settings.cameraEnabled
                        ? "Preparing your preview"
                        : "Camera is off"}
                    </p>
                    <p className="mt-1 max-w-sm text-sm font-semibold leading-6 text-media-foreground">
                      {permissionError ??
                        "Turn on your camera or microphone to test your setup before joining."}
                    </p>
                  </div>
                </div>
              )}

              <div className="absolute left-4 top-4 rounded-md bg-overlay/90 px-3 py-1.5 text-xs font-semibold text-media-foreground">
                Local preview
              </div>
            </div>

            <div className="flex shrink-0 flex-wrap items-center justify-center gap-3 border-t border-border bg-card px-4 py-4">
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

          <aside className="flex flex-col gap-4 rounded-lg border border-border bg-card p-4 text-foreground">
            <div>
              <h3 className="text-section-title font-semibold">
                Ready to start?
              </h3>
              <p className="mt-1 text-sm font-semibold leading-6 text-muted-foreground">
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
                className="w-full"
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
    </DialogSurface>
  );
}
