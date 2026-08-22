"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { useAppIntl } from "@/features/i18n/useAppIntl";

interface UseSpeechToTextProps {
  onTranscript: (finalText: string) => void;
}

export function useSpeechToText({ onTranscript }: UseSpeechToTextProps) {
  const intl = useAppIntl();
  const [isDictating, setIsDictating] = useState(false);
  const [interimMessage, setInterimMessage] = useState("");
  const recognitionRef = useRef<any>(null);
  const isDictatingRef = useRef(false);

  const resetDictationState = useCallback(() => {
    isDictatingRef.current = false;
    setIsDictating(false);
    setInterimMessage("");
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition =
        (window as any).SpeechRecognition ||
        (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = "vi-VN";

        recognition.onresult = (event: any) => {
          let finalTranscript = "";
          let currentInterim = "";
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              finalTranscript += event.results[i][0].transcript;
            } else {
              currentInterim += event.results[i][0].transcript;
            }
          }

          if (finalTranscript) {
            onTranscript(finalTranscript);
          }
          setInterimMessage(currentInterim);
        };

        recognition.onerror = (event: any) => {
          console.error("Speech recognition error", event.error);
          resetDictationState();

          const errorMessageIds: Record<string, string> = {
            network: "chat.speechNetworkError",
            "not-allowed": "chat.microphonePermissionBlocked",
            "service-not-allowed": "chat.speechServiceBlocked",
            "no-speech": "chat.noSpeechDetected",
            "audio-capture": "chat.noMicrophoneDetected",
          };

          toast.error(
            intl.formatMessage({
              id:
                errorMessageIds[event.error] ||
                "chat.speechRecognitionStopped",
            }),
          );
        };

        recognition.onend = () => {
          resetDictationState();
        };

        recognitionRef.current = recognition;
      }
    }
  }, [intl, onTranscript, resetDictationState]);

  const stopDictation = useCallback(() => {
    if (!recognitionRef.current || !isDictatingRef.current) return;

    try {
      recognitionRef.current.stop();
    } catch (error) {
      console.error("Error stopping speech recognition:", error);
    }
    resetDictationState();
  }, [resetDictationState]);

  const startDictation = useCallback(() => {
    if (!recognitionRef.current) {
      toast.error(
        intl.formatMessage({ id: "chat.speechRecognitionNotSupported" }),
      );
      return false;
    }

    try {
      recognitionRef.current.start();
      isDictatingRef.current = true;
      setIsDictating(true);
      return true;
    } catch (error) {
      console.error("Error starting speech recognition:", error);
      resetDictationState();
      toast.error(intl.formatMessage({ id: "chat.speechAlreadyRunning" }));
      return false;
    }
  }, [intl, resetDictationState]);

  const toggleDictation = useCallback(() => {
    if (isDictatingRef.current) {
      stopDictation();
      return false;
    }

    return startDictation();
  }, [startDictation, stopDictation]);

  useEffect(() => {
    return () => {
      if (recognitionRef.current && isDictatingRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  const clearInterim = useCallback(() => {
    setInterimMessage("");
  }, []);

  return {
    isDictating,
    interimMessage,
    startDictation,
    stopDictation,
    toggleDictation,
    clearInterim,
  };
}
