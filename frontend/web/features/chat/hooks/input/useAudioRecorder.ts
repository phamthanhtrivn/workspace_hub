"use client";

import {
  logActionError,
  getActionErrorMessage,
} from "@/lib/permission-feedback";
import { useState, useRef, useEffect, useCallback } from "react";
import { toast } from "sonner";
import {
  preferredRecordingType,
  recordingFormat,
} from "../../utils/voice-audio";
import { VOICE, VOICE_LABELS } from "../../constants/voice.constants";
interface UseAudioRecorderProps {
  onRecordComplete: (file: File) => void;
}

export function useAudioRecorder({ onRecordComplete }: UseAudioRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const shouldUploadRecordingRef = useRef(true);
  const recordingPendingRef = useRef(false);
  const mountedRef = useRef(true);
  const recordingAttemptRef = useRef(0);
  const invalidateRecordingAttempt = useCallback(() => {
    recordingAttemptRef.current++;
  }, []);

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
    if (recordingPendingRef.current) return false;
    if (!navigator.mediaDevices?.getUserMedia) {
      toast.error("Microphone recording is not supported in this browser");
      return false;
    }

    if (typeof MediaRecorder === "undefined") {
      toast.error("Voice messages are not supported in this browser");
      return false;
    }

    recordingPendingRef.current = true;
    const attempt = ++recordingAttemptRef.current;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });
      if (!mountedRef.current || attempt !== recordingAttemptRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return false;
      }
      const requestedType = preferredRecordingType(
        (mime) =>
          typeof MediaRecorder.isTypeSupported === "function" &&
          MediaRecorder.isTypeSupported(mime),
      );
      let mediaRecorder: MediaRecorder;
      try {
        mediaRecorder = new MediaRecorder(
          stream,
          requestedType ? { mimeType: requestedType } : undefined,
        );
      } catch (error) {
        stream.getTracks().forEach((track) => track.stop());
        throw error;
      }
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      shouldUploadRecordingRef.current = true;

      mediaRecorder.ondataavailable = (e) => {
        if (attempt !== recordingAttemptRef.current) return;
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
          if (
            audioChunksRef.current.reduce(
              (size, chunk) => size + chunk.size,
              0,
            ) > VOICE.maxBytes
          ) {
            shouldUploadRecordingRef.current = false;
            toast.error(VOICE_LABELS.tooLarge);
            if (mediaRecorder.state === "recording") mediaRecorder.stop();
          }
        }
      };

      mediaRecorder.onstop = () => {
        if (attempt !== recordingAttemptRef.current) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        if (
          mountedRef.current &&
          shouldUploadRecordingRef.current &&
          audioChunksRef.current.length > 0
        ) {
          try {
            const format = recordingFormat(
              mediaRecorder.mimeType ||
                audioChunksRef.current[0].type ||
                requestedType ||
                "",
            );
            const audioFile = new File(
              audioChunksRef.current,
              `voice_message_${Date.now()}.${format.extension}`,
              { type: format.mimeType },
            );
            if (audioFile.size <= VOICE.maxBytes) onRecordComplete(audioFile);
            else toast.error(VOICE_LABELS.tooLarge);
          } catch {
            toast.error(VOICE_LABELS.unsupported);
          }
        }

        audioChunksRef.current = [];
        shouldUploadRecordingRef.current = true;
        stream.getTracks().forEach((track) => track.stop());
        recordingPendingRef.current = false;
        if (mountedRef.current) resetRecordingState();
      };
      mediaRecorder.onerror = () => {
        if (attempt !== recordingAttemptRef.current) return;
        shouldUploadRecordingRef.current = false;
        stream.getTracks().forEach((track) => track.stop());
        recordingPendingRef.current = false;
        if (mountedRef.current) {
          resetRecordingState();
          toast.error(VOICE_LABELS.unsupported);
        }
      };

      mediaRecorder.start(1000);
      setIsRecording(true);
      setRecordingTime(0);

      const startedAt = performance.now();
      recordingIntervalRef.current = setInterval(() => {
        const seconds = Math.floor((performance.now() - startedAt) / 1000);
        setRecordingTime(seconds);
        if (
          seconds >= VOICE.maxSeconds &&
          mediaRecorder.state === "recording"
        ) {
          toast.info(VOICE_LABELS.tooLong);
          mediaRecorder.stop();
        }
      }, 1000);

      return true;
    } catch (err) {
      if (attempt !== recordingAttemptRef.current) return false;
      recordingPendingRef.current = false;
      mediaRecorderRef.current?.stream
        .getTracks()
        .forEach((track) => track.stop());
      if (!mountedRef.current) return false;
      logActionError("Error accessing microphone:", err);
      resetRecordingState();
      toast.error(getActionErrorMessage(err, "Cannot access microphone"));
      return false;
    }
  }, [onRecordComplete, resetRecordingState]);

  const stopRecording = useCallback(() => {
    const mediaRecorder = mediaRecorderRef.current;
    if (!mediaRecorder || mediaRecorder.state === "inactive") return;

    shouldUploadRecordingRef.current = true;
    mediaRecorder.stop();
    resetRecordingState();
  }, [resetRecordingState]);

  const cancelRecording = useCallback(() => {
    shouldUploadRecordingRef.current = false;
    const mediaRecorder = mediaRecorderRef.current;
    if (!mediaRecorder || mediaRecorder.state === "inactive") {
      invalidateRecordingAttempt();
      recordingPendingRef.current = false;
      audioChunksRef.current = [];
      resetRecordingState();
      return;
    }

    shouldUploadRecordingRef.current = false;
    audioChunksRef.current = [];
    mediaRecorder.stop();
    resetRecordingState();
  }, [resetRecordingState, invalidateRecordingAttempt]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      invalidateRecordingAttempt();
      recordingPendingRef.current = false;
      shouldUploadRecordingRef.current = false;
      clearRecordingInterval();
      if (
        mediaRecorderRef.current &&
        mediaRecorderRef.current.state === "recording"
      ) {
        shouldUploadRecordingRef.current = false;
        mediaRecorderRef.current.stream.getTracks().forEach((t) => t.stop());
      }
    };
  }, [clearRecordingInterval, invalidateRecordingAttempt]);

  return {
    isRecording,
    recordingTime,
    startRecording,
    stopRecording,
    cancelRecording,
  };
}
