"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { toast } from "sonner";

interface UseSpeechToTextProps {
  onTranscript: (finalText: string) => void;
}

export function useSpeechToText({ onTranscript }: UseSpeechToTextProps) {
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

          const errorMessages: Record<string, string> = {
            network:
              "Speech recognition service is unavailable. Please check your connection and try again.",
            "not-allowed":
              "Microphone permission is blocked. Please allow microphone access and try again.",
            "service-not-allowed":
              "Speech recognition is blocked by the browser or network policy.",
            "no-speech": "No speech was detected. Please try speaking again.",
            "audio-capture":
              "No microphone was detected. Please check your audio input.",
          };

          toast.error(
            errorMessages[event.error] ||
              "Speech recognition stopped unexpectedly.",
          );
        };

        recognition.onend = () => {
          resetDictationState();
        };

        recognitionRef.current = recognition;
      }
    }
  }, [onTranscript, resetDictationState]);

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
      toast.error("Your browser does not support speech recognition.");
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
      toast.error("Speech recognition is already running. Please try again.");
      return false;
    }
  }, [resetDictationState]);

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
