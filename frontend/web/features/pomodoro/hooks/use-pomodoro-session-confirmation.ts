"use client";

import { useCallback, useRef, useState } from "react";
import type { usePomodoroTimer } from "./use-pomodoro-timer";
import type { PomodoroSessionAction } from "../types/pomodoro";

type Timer = ReturnType<typeof usePomodoroTimer>;

export function usePomodoroSessionConfirmation(timer: Timer, blocked: boolean) {
  const [pending, setPending] = useState<{ identity: string; action: PomodoroSessionAction } | null>(null);
  const [confirming, setConfirming] = useState(false);
  const inFlight = useRef(false);
  const finished = timer.status === "RUNNING" && timer.timeLeft === 0;
  const pendingSessionAction = pending?.identity === timer.sessionIdentity && timer.status !== "IDLE" && !finished
    ? pending.action : null;
  const { reset, skip, switchMode } = timer;
  const perform = useCallback((action: PomodoroSessionAction) => {
    if (action.type === "reset") return reset();
    if (action.type === "skip") return skip();
    return switchMode(action.mode);
  }, [reset, skip, switchMode]);

  const requestSessionAction = (action: PomodoroSessionAction) => {
    if (!timer.isReady || blocked || finished || timer.isTaskActionPending || inFlight.current) return;
    if (action.type === "mode" && action.mode === timer.mode) return;
    if (timer.status === "IDLE") { void perform(action); return; }
    setPending({ identity: timer.sessionIdentity, action });
  };
  const cancelSessionAction = () => {
    if (!inFlight.current) setPending(null);
  };
  const confirmSessionAction = async () => {
    if (!pendingSessionAction || blocked || finished || timer.isTaskActionPending || inFlight.current) return;
    inFlight.current = true;
    setConfirming(true);
    try { if (await perform(pendingSessionAction)) setPending(null); }
    finally { inFlight.current = false; setConfirming(false); }
  };
  return { pendingSessionAction, confirming, requestSessionAction, cancelSessionAction, confirmSessionAction };
}
