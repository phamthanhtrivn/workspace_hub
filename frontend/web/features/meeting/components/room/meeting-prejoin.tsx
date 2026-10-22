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
import { NativeCheckbox } from "@/components/ui/checkbox";
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
      <div className="fixed inset-0 z-[100] flex h-dvh min-h-0 flex-col overflow-y-auto bg-background text-foreground">
        <header className="flex shrink-0 items-center justify-between border-b border-border bg-card px-4 py-3 sm:px-6">
          <div className="min-w-0">
            <h2 className="text-section-title font-semibold text-foreground">
              Instant meeting
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Check your audio and video
            </p>
          </div>

          <MeetingIconButton
            label="Close"
            icon={X}
            onClick={onCancel}
            className="text-muted-foreground hover:bg-accent hover:text-foreground"
          />
        </header>

        <main className="grid min-h-0 flex-1 gap-5 px-4 py-5 lg:grid-cols-[minmax(0,1fr)_390px] lg:px-6">
          <section className="flex min-h-[min(240px,40dvh)] flex-col overflow-hidden rounded-panel border border-border bg-media-background">
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
                <div className="flex h-full min-h-[min(240px,40dvh)] flex-col items-center justify-center gap-4 bg-media-background px-6 text-center">
                  <span className="grid h-20 w-20 place-items-center rounded-full bg-media-surface text-media-foreground">
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
                    <p className="mt-1 max-w-sm text-sm leading-6 text-media-foreground/80">
                      {permissionError ??
                        "Turn on your camera or microphone to test your setup before joining."}
                    </p>
                  </div>
                </div>
              )}

              <div className="absolute left-4 top-4 rounded-control bg-media-surface/90 px-3 py-1.5 text-xs font-medium text-media-foreground">
                Local preview
              </div>
            </div>

            <div className="flex shrink-0 flex-wrap items-center justify-center gap-3 border-t border-border bg-card px-4 py-4">
              <MeetingButton
                type="button"
                tone={settings.microphoneEnabled ? "secondary" : "danger"}
                aria-pressed={settings.microphoneEnabled}
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
                aria-pressed={settings.cameraEnabled}
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

          <aside className="flex flex-col gap-4 rounded-panel border border-border bg-card p-4 text-card-foreground">
            <div>
              <h3 className="text-section-title font-semibold">
                Ready to start?
              </h3>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
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
                <label className="flex items-center gap-3 rounded-md border p-3 text-sm">
                  <NativeCheckbox checked={settings.autoRecord ?? false}
                    onChange={(event) => updateSettings({ autoRecord: event.target.checked })} />
                  Automatically record this meeting
                </label>
                <p className="text-xs text-muted-foreground">Cloud recording starts when you connect. Everyone will be notified.</p>
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
