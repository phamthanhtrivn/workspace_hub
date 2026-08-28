"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { useAppIntl } from "@/features/i18n/useAppIntl";
import {
  navigateMeetingWindow,
  openMeetingWindow,
  saveMeetingDevicePreferences,
  stopPreviewStream,
} from "../../utils/meeting.utils";
import { useCreateInstantMeetingMutation } from "../queries/use-meeting-queries";

interface UseInstantMeetingSetupParams {
  open: boolean;
  onClose: () => void;
}

interface MeetingDeviceOption {
  deviceId: string;
  label: string;
}

export function useInstantMeetingSetup({
  open,
  onClose,
}: UseInstantMeetingSetupParams) {
  const intl = useAppIntl();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const previewStreamRef = useRef<MediaStream | null>(null);
  const [previewStream, setPreviewStream] = useState<MediaStream | null>(null);
  const [isCameraEnabled, setIsCameraEnabled] = useState(true);
  const [isMicEnabled, setIsMicEnabled] = useState(true);
  const [isPreparingDevices, setIsPreparingDevices] = useState(false);
  const [deviceError, setDeviceError] = useState<string | null>(null);
  const [cameraDevices, setCameraDevices] = useState<MeetingDeviceOption[]>([]);
  const [micDevices, setMicDevices] = useState<MeetingDeviceOption[]>([]);
  const [selectedCameraDeviceId, setSelectedCameraDeviceId] = useState("");
  const [selectedMicDeviceId, setSelectedMicDeviceId] = useState("");
  const createMeeting = useCreateInstantMeetingMutation();

  const syncDevices = async () => {
    if (!navigator.mediaDevices?.enumerateDevices) return;

    const devices = await navigator.mediaDevices.enumerateDevices();
    const nextCameraDevices = devices
      .filter((device) => device.kind === "videoinput")
      .map((device, index) => ({
        deviceId: device.deviceId,
        label:
          device.label ||
          intl.formatMessage(
            { id: "meeting.deviceSetup.cameraFallback" },
            { number: index + 1 },
          ),
      }));
    const nextMicDevices = devices
      .filter((device) => device.kind === "audioinput")
      .map((device, index) => ({
        deviceId: device.deviceId,
        label:
          device.label ||
          intl.formatMessage(
            { id: "meeting.deviceSetup.micFallback" },
            { number: index + 1 },
          ),
      }));

    setCameraDevices(nextCameraDevices);
    setMicDevices(nextMicDevices);
    setSelectedCameraDeviceId((deviceId) =>
      deviceId || nextCameraDevices[0]?.deviceId || "",
    );
    setSelectedMicDeviceId((deviceId) =>
      deviceId || nextMicDevices[0]?.deviceId || "",
    );
  };

  useEffect(() => {
    if (!open) return;
    void syncDevices();
  }, [open]);

  useEffect(() => {
    if (!open) {
      resetPreview();
      return;
    }

    let cancelled = false;

    async function prepareDevices() {
      resetPreview();

      if (!isCameraEnabled) {
        return;
      }

      if (!navigator.mediaDevices?.getUserMedia) {
        setDeviceError(
          intl.formatMessage({ id: "meeting.deviceSetup.unsupported" }),
        );
        return;
      }

      setIsPreparingDevices(true);
      try {
        let stream: MediaStream;
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: selectedCameraDeviceId
              ? { deviceId: { exact: selectedCameraDeviceId } }
              : true,
            audio: false,
          });
        } catch (error) {
          if (!selectedCameraDeviceId) throw error;
          stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false,
          });
        }

        if (cancelled) {
          stopPreviewStream(stream);
          return;
        }

        previewStreamRef.current = stream;
        setPreviewStream(stream);
        void syncDevices();
      } catch {
        if (!cancelled) {
          setDeviceError(
            intl.formatMessage({ id: "meeting.deviceSetup.permissionDenied" }),
          );
        }
      } finally {
        if (!cancelled) {
          setIsPreparingDevices(false);
        }
      }
    }

    void prepareDevices();

    return () => {
      cancelled = true;
    };
  }, [intl, isCameraEnabled, open, selectedCameraDeviceId]);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = previewStream;
    }
  }, [previewStream]);

  useEffect(() => {
    return () => {
      stopPreviewStream(previewStreamRef.current);
      previewStreamRef.current = null;
    };
  }, []);

  const resetPreview = () => {
    stopPreviewStream(previewStreamRef.current);
    previewStreamRef.current = null;
    setPreviewStream(null);
    setDeviceError(null);
  };

  const closeSetup = () => {
    resetPreview();
    onClose();
  };

  const submitInstantMeeting = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();
    const meetingWindow = openMeetingWindow();
    try {
      const response = await createMeeting.mutateAsync({});
      saveMeetingDevicePreferences(response.data.joinToken, {
        isCameraEnabled,
        isMicEnabled,
        cameraDeviceId: selectedCameraDeviceId || undefined,
        micDeviceId: selectedMicDeviceId || undefined,
      });
      navigateMeetingWindow(meetingWindow, response.data.joinToken);
      resetPreview();
      onClose();
    } catch (error) {
      meetingWindow?.close();
      throw error;
    }
  };

  return {
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
    isCreatingMeeting: createMeeting.isPending,
    closeSetup,
    submitInstantMeeting,
    setSelectedCameraDeviceId,
    setSelectedMicDeviceId,
    toggleMic: () => setIsMicEnabled((value) => !value),
    toggleCamera: () => setIsCameraEnabled((value) => !value),
  };
}
