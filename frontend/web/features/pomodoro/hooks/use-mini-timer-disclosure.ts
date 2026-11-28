"use client";

import { useState } from "react";
import type { PomodoroMode, PomodoroStatus } from "../types/pomodoro";

/** Presentation only: observing phase changes never advances or saves the timer. */
export function useMiniTimerDisclosure({ mode, status, noticeKey, needsAttention }: {
  mode: PomodoroMode;
  status: PomodoroStatus;
  noticeKey: string;
  needsAttention: boolean;
}) {
  const eventKey = `${mode}:${status}:${noticeKey}`;
  const [view, setView] = useState({ eventKey, mode, status, expanded: needsAttention, readyNotice: false });
  if (view.eventKey !== eventKey) {
    const phaseEnded = view.mode !== mode && view.status !== "IDLE";
    const readyNotice = status === "IDLE" && (phaseEnded || view.readyNotice);
    setView({ eventKey, mode, status, readyNotice,
      expanded: status === "IDLE" && !readyNotice ? false : needsAttention || phaseEnded || view.expanded,
    });
  }
  const collapse = () => setView(current => ({ ...current, expanded: false, readyNotice: false }));
  const toggle = () => {
    if (view.expanded) collapse();
    else setView(current => ({ ...current, expanded: true }));
  };
  return { expanded: view.expanded, readyNotice: view.readyNotice, toggle, collapse };
}
