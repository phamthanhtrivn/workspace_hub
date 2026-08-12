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
          };

          if (finalTranscript) {
            onTranscript(finalTranscript);
          }
          setInterimMessage(currentInterim);
        };

        recognition.onerror = (event: any) => {
          console.error("Speech recognition error", event.error);
          setIsDictating(false);
          setInterimMessage("");
        };

        recognition.onend = () => {
          setIsDictating(false);
          setInterimMessage("");
        };

        recognitionRef.current = recognition;
      }
    }
  }, [onTranscript]);

  const toggleDictation = useCallback(() => {
    if (isDictating) {
      recognitionRef.current?.stop();
      setIsDictating(false);
    } else {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.start();
          setIsDictating(true);
        } catch (e) {
          console.error(e);
        }
      } else {
        toast.error("Your browser does not support speech recognition.");
      }
    }
  }, [isDictating]);

  useEffect(() => {
    return () => {
      if (recognitionRef.current && isDictating) {
        recognitionRef.current.stop();
      }
    };
  }, [isDictating]);

  const clearInterim = useCallback(() => {
    setInterimMessage("");
  }, []);

  return {
    isDictating,
    interimMessage,
    toggleDictation,
    clearInterim,
  };
}
