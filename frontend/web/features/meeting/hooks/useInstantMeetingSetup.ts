"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { useAppIntl } from "@/features/i18n/useAppIntl";
import { stopPreviewStream } from "../utils/meeting.utils";
import { useCreateInstantMeetingMutation } from "./useMeetingQueries";

interface UseInstantMeetingSetupParams {
  open: boolean;
  onClose: () => void;
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
  const [allowJoinWithoutApproval, setAllowJoinWithoutApproval] =
    useState(true);
  const createMeeting = useCreateInstantMeetingMutation();

  useEffect(() => {
    if (!open) {
      resetPreview();
      return;
    }

    let cancelled = false;

    async function prepareDevices() {
      resetPreview();

      if (!isCameraEnabled && !isMicEnabled) {
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
        const stream = await navigator.mediaDevices.getUserMedia({
          video: isCameraEnabled,
          audio: isMicEnabled,
        });

        if (cancelled) {
          stopPreviewStream(stream);
          return;
        }

        previewStreamRef.current = stream;
        setPreviewStream(stream);
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
  }, [intl, isCameraEnabled, isMicEnabled, open]);

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
    setAllowJoinWithoutApproval(false);
    onClose();
  };

  const submitInstantMeeting = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();
    await createMeeting.mutateAsync({
      allowJoinWithoutApproval,
    });
    resetPreview();
    setAllowJoinWithoutApproval(false);
    onClose();
  };

  return {
    videoRef,
    previewStream,
    isCameraEnabled,
    isMicEnabled,
    isPreparingDevices,
    deviceError,
    allowJoinWithoutApproval,
    isCreatingMeeting: createMeeting.isPending,
    closeSetup,
    submitInstantMeeting,
    setAllowJoinWithoutApproval,
    toggleMic: () => setIsMicEnabled((value) => !value),
    toggleCamera: () => setIsCameraEnabled((value) => !value),
  };
}
