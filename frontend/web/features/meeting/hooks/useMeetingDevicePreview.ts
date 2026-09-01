"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type {
  MeetingDeviceOption,
  MeetingPreJoinSettings,
} from "../types/meeting.types";

const fallbackCameraDevice: MeetingDeviceOption = {
  deviceId: "",
  label: "Default camera",
};

const fallbackMicrophoneDevice: MeetingDeviceOption = {
  deviceId: "",
  label: "Default microphone",
};

interface MeetingDevicePreviewState {
  cameras: MeetingDeviceOption[];
  microphones: MeetingDeviceOption[];
  previewStream: MediaStream | null;
  isPreviewLoading: boolean;
  permissionError: string | null;
  refreshDevices: () => Promise<void>;
  stopPreview: () => void;
}

function toDeviceOption(device: MediaDeviceInfo, fallbackLabel: string) {
  return {
    deviceId: device.deviceId,
    label: device.label || fallbackLabel,
  };
}

export function useMeetingDevicePreview(
  settings: MeetingPreJoinSettings,
): MeetingDevicePreviewState {
  const previewStreamRef = useRef<MediaStream | null>(null);
  const [cameras, setCameras] = useState<MeetingDeviceOption[]>([]);
  const [microphones, setMicrophones] = useState<MeetingDeviceOption[]>([]);
  const [previewStream, setPreviewStream] = useState<MediaStream | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [permissionError, setPermissionError] = useState<string | null>(null);

  const stopPreview = useCallback(() => {
    previewStreamRef.current?.getTracks().forEach((track) => track.stop());
    previewStreamRef.current = null;
    setPreviewStream(null);
  }, []);

  const refreshDevices = useCallback(async () => {
    if (!navigator.mediaDevices?.enumerateDevices) {
      setCameras([fallbackCameraDevice]);
      setMicrophones([fallbackMicrophoneDevice]);
      return;
    }

    const devices = await navigator.mediaDevices.enumerateDevices();
    const nextCameras = devices
      .filter((device) => device.kind === "videoinput")
      .map((device, index) => toDeviceOption(device, `Camera ${index + 1}`));
    const nextMicrophones = devices
      .filter((device) => device.kind === "audioinput")
      .map((device, index) =>
        toDeviceOption(device, `Microphone ${index + 1}`),
      );

    setCameras(nextCameras.length > 0 ? nextCameras : [fallbackCameraDevice]);
    setMicrophones(
      nextMicrophones.length > 0
        ? nextMicrophones
        : [fallbackMicrophoneDevice],
    );
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      void refreshDevices();
    });
  }, [refreshDevices]);

  useEffect(() => {
    let isCurrent = true;

    async function startPreview() {
      stopPreview();

      if (!settings.cameraEnabled) {
        setIsPreviewLoading(false);
        setPermissionError(null);
        return;
      }

      if (!navigator.mediaDevices?.getUserMedia) {
        setPermissionError("meeting.prejoin.deviceUnsupported");
        setIsPreviewLoading(false);
        return;
      }

      setIsPreviewLoading(true);
      setPermissionError(null);

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            deviceId: settings.cameraDeviceId
              ? { exact: settings.cameraDeviceId }
              : undefined,
          },
          audio: false,
        });

        if (!isCurrent) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        previewStreamRef.current = stream;
        setPreviewStream(stream);
        await refreshDevices();
      } catch {
        if (isCurrent) {
          setPermissionError("meeting.prejoin.devicePermissionError");
          setPreviewStream(null);
        }
      } finally {
        if (isCurrent) {
          setIsPreviewLoading(false);
        }
      }
    }

    queueMicrotask(() => {
      void startPreview();
    });

    return () => {
      isCurrent = false;
      stopPreview();
    };
  }, [
    refreshDevices,
    settings.cameraDeviceId,
    settings.cameraEnabled,
    stopPreview,
  ]);

  return {
    cameras,
    microphones,
    previewStream,
    isPreviewLoading,
    permissionError,
    refreshDevices,
    stopPreview,
  };
}
