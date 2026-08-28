"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAppIntl } from "@/features/i18n/useAppIntl";
import {
  getMeetingDevicePreferences,
  saveMeetingDevicePreferences,
  stopPreviewStream,
} from "../../utils/meeting.utils";

interface MeetingDeviceOption {
  deviceId: string;
  label: string;
}

export function useMeetingJoinDeviceSetup(joinToken: string) {
  const intl = useAppIntl();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const previewStreamRef = useRef<MediaStream | null>(null);
  const storedPreferences = getMeetingDevicePreferences(joinToken);
  const [previewStream, setPreviewStream] = useState<MediaStream | null>(null);
  const [isCameraEnabled, setIsCameraEnabled] = useState(false);
  const [isMicEnabled, setIsMicEnabled] = useState(false);
  const [isPreparingDevices, setIsPreparingDevices] = useState(false);
  const [deviceError, setDeviceError] = useState<string | null>(null);
  const [cameraDevices, setCameraDevices] = useState<MeetingDeviceOption[]>([]);
  const [micDevices, setMicDevices] = useState<MeetingDeviceOption[]>([]);
  const [selectedCameraDeviceId, setSelectedCameraDeviceId] = useState(
    storedPreferences.cameraDeviceId ?? "",
  );
  const [selectedMicDeviceId, setSelectedMicDeviceId] = useState(
    storedPreferences.micDeviceId ?? "",
  );

  const syncDevices = useCallback(async () => {
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
      nextCameraDevices.some((device) => device.deviceId === deviceId)
        ? deviceId
        : nextCameraDevices[0]?.deviceId || "",
    );
    setSelectedMicDeviceId((deviceId) =>
      nextMicDevices.some((device) => device.deviceId === deviceId)
        ? deviceId
        : nextMicDevices[0]?.deviceId || "",
    );
  }, [intl]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void syncDevices();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [syncDevices]);

  useEffect(() => {
    let cancelled = false;

    async function preparePreview() {
      stopPreviewStream(previewStreamRef.current);
      previewStreamRef.current = null;
      setPreviewStream(null);
      setDeviceError(null);

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

    void preparePreview();

    return () => {
      cancelled = true;
    };
  }, [intl, isCameraEnabled, selectedCameraDeviceId, syncDevices]);

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

  const saveDevicePreferences = () => {
    saveMeetingDevicePreferences(joinToken, {
      isCameraEnabled,
      isMicEnabled,
      cameraDeviceId: selectedCameraDeviceId || undefined,
      micDeviceId: selectedMicDeviceId || undefined,
    });
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
    saveDevicePreferences,
    setSelectedCameraDeviceId,
    setSelectedMicDeviceId,
    toggleMic: () => setIsMicEnabled((value) => !value),
    toggleCamera: () => setIsCameraEnabled((value) => !value),
  };
}
