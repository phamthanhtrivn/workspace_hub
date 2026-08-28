"use client";

import { FormEvent } from "react";
import { Clock3, Loader2, ShieldCheck, Video, XCircle } from "lucide-react";
import { useAppIntl } from "@/features/i18n/useAppIntl";
import { useMeetingJoinDeviceSetup } from "../../hooks/join/use-meeting-join-device-setup";
import { MeetingParticipantStatus, MeetingResponse } from "../../types/meeting.types";
import { canRequestMeetingJoin } from "../../utils/meeting.utils";
import { DeviceSelectionGroup } from "../common/device-selection-group";
import { InstantMeetingDeviceToggles } from "../instant/instant-meeting-device-toggles";
import { InstantMeetingPreview } from "../instant/instant-meeting-preview";

interface MeetingJoinStatePanelProps {
  joinToken: string;
  meeting: MeetingResponse;
  participantStatus: MeetingParticipantStatus | null;
  isRequestingJoin: boolean;
  onRequestJoin: () => void;
}

export function MeetingJoinStatePanel({
  joinToken,
  meeting,
  participantStatus,
  isRequestingJoin,
  onRequestJoin,
}: MeetingJoinStatePanelProps) {
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
    saveDevicePreferences,
    setSelectedCameraDeviceId,
    setSelectedMicDeviceId,
    toggleMic,
    toggleCamera,
  } = useMeetingJoinDeviceSetup(joinToken);
  const stateIcon =
    participantStatus === MeetingParticipantStatus.REQUESTED ? (
      <Clock3 className="h-7 w-7 text-amber-600" />
    ) : participantStatus === MeetingParticipantStatus.REJECTED ? (
      <XCircle className="h-7 w-7 text-red-600" />
    ) : (
      <ShieldCheck className="h-7 w-7 text-blue-600" />
    );
  const stateMessageId =
    participantStatus === MeetingParticipantStatus.REQUESTED
      ? "meeting.requestWaiting"
      : participantStatus === MeetingParticipantStatus.REJECTED
        ? "meeting.requestRejected"
        : meeting.allowJoinWithoutApproval
          ? "meeting.openJoinReady"
          : "meeting.approvalJoinReady";
  const canRequestJoin = canRequestMeetingJoin(meeting);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canRequestJoin) return;

    saveDevicePreferences();
    onRequestJoin();
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="max-h-[calc(100vh-3rem)] w-full max-w-3xl overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-2xl"
      role="dialog"
      aria-modal="true"
      aria-labelledby="meeting-join-setup-title"
    >
        <div className="border-b border-slate-200 px-5 py-4">
          <div className="flex items-start gap-4">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-blue-50">
              <Video className="h-6 w-6 text-blue-600" />
            </div>
            <div className="min-w-0">
              <h1
                id="meeting-join-setup-title"
                className="text-2xl font-bold text-slate-900"
              >
                {intl.formatMessage({ id: "meeting.instantMeetingName" })}
              </h1>
              <p className="mt-1 text-sm font-medium text-slate-500">
                {intl.formatMessage({
                  id: meeting.allowJoinWithoutApproval
                    ? "meeting.openAccess"
                    : "meeting.approvalRequired",
                })}
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-5 px-5 py-5">
          <div className="flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-4">
            {stateIcon}
            <div>
              <p className="text-base font-bold text-slate-900">
                {intl.formatMessage({ id: stateMessageId })}
              </p>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                {intl.formatMessage({
                  id: "meeting.joinSetup.description",
                })}
              </p>
            </div>
          </div>

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
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-5 py-4">
          <div className="min-w-0 flex-1 text-xs font-semibold text-slate-500">
            {intl.formatMessage({ id: "meeting.joinSetup.savePreferences" })}
          </div>
          {canRequestJoin ? (
            <button
              type="submit"
              disabled={isRequestingJoin}
              className="flex h-10 items-center gap-2 rounded-md bg-blue-600 px-4 text-sm font-bold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isRequestingJoin ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : null}
              {isRequestingJoin
                ? intl.formatMessage({ id: "meeting.requestingJoin" })
                : intl.formatMessage({ id: "meeting.requestJoin" })}
            </button>
          ) : null}
        </div>
    </form>
  );
}
