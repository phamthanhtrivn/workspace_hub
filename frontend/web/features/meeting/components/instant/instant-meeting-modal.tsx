"use client";

import { X } from "lucide-react";
import { useAppIntl } from "@/features/i18n/useAppIntl";
import { useInstantMeetingSetup } from "../../hooks/instant/use-instant-meeting-setup";
import { DeviceSelectionGroup } from "../common/device-selection-group";
import { InstantMeetingAccessSettings } from "./instant-meeting-access-settings";
import { InstantMeetingDeviceToggles } from "./instant-meeting-device-toggles";
import { InstantMeetingPreview } from "./instant-meeting-preview";

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
    cameraDevices,
    micDevices,
    selectedCameraDeviceId,
    selectedMicDeviceId,
    isPreparingDevices,
    deviceError,
    allowJoinWithoutApproval,
    isCreatingMeeting,
    closeSetup,
    submitInstantMeeting,
    setAllowJoinWithoutApproval,
    setSelectedCameraDeviceId,
    setSelectedMicDeviceId,
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
            <InstantMeetingPreview
              videoRef={videoRef}
              previewStream={previewStream}
              isCameraEnabled={isCameraEnabled}
              isPreparingDevices={isPreparingDevices}
              deviceError={deviceError}
            />

            <InstantMeetingDeviceToggles
              isMicEnabled={isMicEnabled}
              isCameraEnabled={isCameraEnabled}
              onToggleMic={toggleMic}
              onToggleCamera={toggleCamera}
            />

            <div className="space-y-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
              <DeviceSelectionGroup
                title={intl.formatMessage({
                  id: "meeting.deviceSetup.selectCamera",
                })}
                emptyLabel={intl.formatMessage({
                  id: "meeting.deviceSetup.noCamera",
                })}
                devices={cameraDevices}
                selectedDeviceId={selectedCameraDeviceId}
                onSelect={setSelectedCameraDeviceId}
              />

              <DeviceSelectionGroup
                title={intl.formatMessage({
                  id: "meeting.deviceSetup.selectMic",
                })}
                emptyLabel={intl.formatMessage({
                  id: "meeting.deviceSetup.noMic",
                })}
                devices={micDevices}
                selectedDeviceId={selectedMicDeviceId}
                onSelect={setSelectedMicDeviceId}
              />
            </div>
          </section>

          <InstantMeetingAccessSettings
            allowJoinWithoutApproval={allowJoinWithoutApproval}
            onAllowJoinWithoutApprovalChange={setAllowJoinWithoutApproval}
          />
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
