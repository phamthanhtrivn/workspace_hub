"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { useAppIntl } from "@/features/i18n/useAppIntl";

interface UseAudioRecorderProps {
  onRecordComplete: (file: File) => void;
}

export function useAudioRecorder({ onRecordComplete }: UseAudioRecorderProps) {
  const intl = useAppIntl();
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const shouldUploadRecordingRef = useRef(true);

  const clearRecordingInterval = useCallback(() => {
    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
      recordingIntervalRef.current = null;
    }
  }, []);

  const resetRecordingState = useCallback(() => {
    setIsRecording(false);
    setRecordingTime(0);
    clearRecordingInterval();
  }, [clearRecordingInterval]);

  const startRecording = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      toast.error(
        intl.formatMessage({ id: "chat.microphoneRecordingNotSupported" }),
      );
      return false;
    }

    if (typeof MediaRecorder === "undefined") {
      toast.error(
        intl.formatMessage({ id: "chat.voiceMessagesNotSupported" }),
      );
      return false;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      shouldUploadRecordingRef.current = true;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        if (
          shouldUploadRecordingRef.current &&
          audioChunksRef.current.length > 0
        ) {
          const audioBlob = new Blob(audioChunksRef.current, {
            type: "audio/webm",
          });
          const audioFile = new File(
            [audioBlob],
            `voice_message_${Date.now()}.webm`,
            { type: "audio/webm" },
          );
          onRecordComplete(audioFile);
        }

        audioChunksRef.current = [];
        shouldUploadRecordingRef.current = true;
        stream.getTracks().forEach((track) => track.stop());
        resetRecordingState();
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);

      return true;
    } catch (err) {
      console.error("Error accessing microphone:", err);
      resetRecordingState();
      toast.error(intl.formatMessage({ id: "chat.cannotAccessMicrophone" }));
      return false;
    }
  }, [intl, onRecordComplete, resetRecordingState]);

  const stopRecording = useCallback(() => {
    const mediaRecorder = mediaRecorderRef.current;
    if (!mediaRecorder || mediaRecorder.state === "inactive") return;

    shouldUploadRecordingRef.current = true;
    mediaRecorder.stop();
    resetRecordingState();
  }, [resetRecordingState]);

  const cancelRecording = useCallback(() => {
    const mediaRecorder = mediaRecorderRef.current;
    if (!mediaRecorder || mediaRecorder.state === "inactive") {
      audioChunksRef.current = [];
      resetRecordingState();
      return;
    }

    shouldUploadRecordingRef.current = false;
    audioChunksRef.current = [];
    mediaRecorder.stop();
    resetRecordingState();
  }, [resetRecordingState]);

  useEffect(() => {
    return () => {
      clearRecordingInterval();
      if (
        mediaRecorderRef.current &&
        mediaRecorderRef.current.state === "recording"
      ) {
        shouldUploadRecordingRef.current = false;
        mediaRecorderRef.current.stream.getTracks().forEach((t) => t.stop());
      }
    };
  }, [clearRecordingInterval]);

  return {
    isRecording,
    recordingTime,
    startRecording,
    stopRecording,
    cancelRecording,
  };
}
