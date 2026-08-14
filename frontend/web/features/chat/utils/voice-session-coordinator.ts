"use client";

type VoiceSessionType = "speech-to-text" | "voice-message";

interface VoiceSession {
  id: string;
  type: VoiceSessionType;
  stop: () => void;
}

let activeVoiceSession: VoiceSession | null = null;

export function claimVoiceSession(session: VoiceSession) {
  if (activeVoiceSession && activeVoiceSession.id !== session.id) {
    activeVoiceSession.stop();
  }

  activeVoiceSession = session;
}

export function releaseVoiceSession(sessionId: string) {
  if (activeVoiceSession?.id === sessionId) {
    activeVoiceSession = null;
  }
}

