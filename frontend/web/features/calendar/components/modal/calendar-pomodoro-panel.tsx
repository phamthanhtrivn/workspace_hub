"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { clearCalendarPomodoroTimerState, createCalendarPomodoroSession, getCalendarPomodoroConfig, getCalendarPomodoroSessions, getCalendarPomodoroTimerState, saveCalendarPomodoroTimerState } from "../../api/calendar.api";
import type { CalendarEvent, CalendarPomodoroTimerState } from "../../types/calendar.types";

const DURATION_SECONDS = 25 * 60;
type ActiveSession = { eventId: string | null; startedAt: string; targetEndAt: string; plannedSeconds: number; version: number; status: "RUNNING" | "PAUSED" };

function toActiveSession(state: CalendarPomodoroTimerState | null): ActiveSession | null {
  if (!state || state.status === "IDLE") return null;
  return {
    eventId: state.eventId,
    startedAt: state.sessionStartAt ?? new Date().toISOString(),
    targetEndAt: state.targetEndAt ?? new Date(Date.now() + state.remainingSeconds * 1000).toISOString(),
    plannedSeconds: state.remainingSeconds,
    version: state.version,
    status: state.status,
  };
}

export function CalendarPomodoroPanel({ event }: { event: CalendarEvent; userId: string }) {
  const [active, setActive] = useState<ActiveSession | null>(null);
  const [now, setNow] = useState(0);
  const [summary, setSummary] = useState({ focusSeconds: 0, completedFocusSessions: 0 });
  const [durationSeconds, setDurationSeconds] = useState(DURATION_SECONDS);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    getCalendarPomodoroTimerState()
      .then((state) => {
        if (!mounted) return;
        setNow(Date.now());
        setActive(toActiveSession(state));
      })
      .catch(() => { if (mounted) toast.error("Unable to load the Pomodoro state"); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    let mounted = true;
    getCalendarPomodoroSessions(event.id)
      .then((result) => { if (mounted) setSummary(result.summary); })
      .catch(() => { if (mounted) toast.error("Unable to load focus history"); });
    return () => { mounted = false; };
  }, [event.id]);

  useEffect(() => {
    let mounted = true;
    getCalendarPomodoroConfig()
      .then((config) => { if (mounted) setDurationSeconds(config.focusDuration * 60); })
      .catch(() => { /* Keep the default duration if preferences are unavailable. */ });
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const current = active?.eventId === event.id && active.status === "RUNNING" ? active : null;
  const remaining = current ? Math.max(0, Math.ceil((new Date(current.targetEndAt).getTime() - now) / 1000)) : durationSeconds;
  const completed = summary.completedFocusSessions;
  const minutes = Math.round(summary.focusSeconds / 60);

  async function start() {
    if (active || saving || loading) return;
    setSaving(true);
    const startedAt = new Date();
    const targetEndAt = new Date(startedAt.getTime() + durationSeconds * 1000).toISOString();
    try {
      const existing = await getCalendarPomodoroTimerState();
      if (existing && existing.status !== "IDLE") {
        setActive(toActiveSession(existing));
        toast.error("Another focus session is active");
        return;
      }
      const saved = await saveCalendarPomodoroTimerState({
        mode: "FOCUS", status: "RUNNING", targetEndAt,
        remainingSeconds: durationSeconds, cycleCount: existing?.cycleCount ?? 0,
        sessionStartAt: startedAt.toISOString(), eventId: event.id,
        taskId: event.sourceType === "TASK" ? event.sourceId : null,
        activeTask: null, notes: "", expectedVersion: existing?.version ?? 0,
      });
      setActive({ eventId: event.id, startedAt: startedAt.toISOString(), targetEndAt, plannedSeconds: durationSeconds, version: saved.version, status: "RUNNING" });
    } catch { toast.error("Unable to start the Pomodoro session"); }
    finally { setSaving(false); }
  }

  async function discardOtherSession() {
    if (!active || saving) return;
    setSaving(true);
    try {
      await clearCalendarPomodoroTimerState(active.version);
      setActive(null);
      toast.success("Previous focus session discarded");
    } catch { toast.error("Unable to discard the focus session"); }
    finally { setSaving(false); }
  }

  async function finish() {
    if (!current || saving) return;
    setSaving(true);
    const endedAt = new Date();
    const elapsed = Math.max(0, Math.floor((endedAt.getTime() - new Date(current.startedAt).getTime()) / 1000));
    try {
      await createCalendarPomodoroSession({
        clientSessionId: `${event.id}:${current.startedAt}`,
        eventId: event.id,
        taskId: event.sourceType === "TASK" ? event.sourceId ?? undefined : undefined,
        sessionType: "FOCUS",
        status: elapsed >= (current.plannedSeconds ?? DURATION_SECONDS) ? "COMPLETED" : "STOPPED",
        startedAt: current.startedAt,
        endedAt: endedAt.toISOString(),
        plannedSeconds: current.plannedSeconds ?? DURATION_SECONDS,
        actualSeconds: Math.min(current.plannedSeconds ?? DURATION_SECONDS, elapsed),
      });
      await clearCalendarPomodoroTimerState(current.version);
      setActive(null);
      try {
        const refreshed = await getCalendarPomodoroSessions(event.id);
        setSummary(refreshed.summary);
      } catch { /* The saved session will appear on the next refresh. */ }
      toast.success("Focus session saved to Calendar");
    } catch {
      toast.error("Unable to save the session. Please try again.");
    } finally { setSaving(false); }
  }

  return (
    <section className="rounded-xl border border-blue-100 bg-blue-50/60 p-3" aria-label="Pomodoro">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-blue-900">Focus {Math.round((current?.plannedSeconds ?? durationSeconds) / 60)} minutes</p>
          <p className="text-xs text-slate-600">Last 90 days: {completed} sessions · {minutes} minutes of focus</p>
        </div>
        {current ? (
          <div className="text-right">
            <p className="font-mono text-lg font-semibold text-blue-900" aria-live="off">{String(Math.floor(remaining / 60)).padStart(2, "0")}:{String(remaining % 60).padStart(2, "0")}</p>
            <Button size="sm" onClick={finish} disabled={saving}>{remaining === 0 ? "Complete" : "Stop and save"}</Button>
          </div>
        ) : active ? (
          <div className="flex flex-col items-end gap-1">
            <a className="text-xs font-medium text-blue-700 underline" href={active.eventId ? `/calendar?event=${active.eventId}` : "/pomodoro"}>Open active session</a>
            <Button size="sm" variant="outline" onClick={discardOtherSession} disabled={saving}>Discard previous session</Button>
          </div>
        ) : (
          <Button size="sm" onClick={start} disabled={saving || loading}>Start</Button>
        )}
      </div>
    </section>
  );
}
