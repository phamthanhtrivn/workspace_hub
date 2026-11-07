"use client";

import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { cancelCalendarEvent } from "@/features/calendar/api/calendar.api";
import { calendarKeys } from "@/features/calendar/hooks/use-calendar-queries";
import type { CalendarEvent } from "@/features/calendar/types/calendar.types";
import { getActionErrorMessage } from "@/lib/permission-feedback";
import { usePomodoroSessionActions } from "../components/pomodoro-session-provider";

export function useFocusPickerCalendarActions() {
  const { activeTask, stopSession, selectTask, busy, isReady } = usePomodoroSessionActions();
  const queryClient = useQueryClient();
  const inFlight = useRef(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [deleteCandidate, setDeleteCandidate] = useState<CalendarEvent | null>(null);
  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ["pomodoro", "focus-tasks"] });
    void queryClient.invalidateQueries({ queryKey: calendarKeys.all });
  };
  const confirmDelete = async () => {
    if (!deleteCandidate || inFlight.current || saving || busy || !isReady) return;
    inFlight.current = true;
    setSaving(true);
    setError("");
    try {
      if (activeTask?.calendarEventId === deleteCandidate.id) await stopSession();
      await cancelCalendarEvent(deleteCandidate.id);
      if (activeTask?.calendarEventId === deleteCandidate.id) await selectTask(null);
      refresh();
      setDeleteCandidate(null);
    } catch (failure) { setError(getActionErrorMessage(failure, "Unable to delete this Calendar task. Please try again.")); }
    finally { inFlight.current = false; setSaving(false); }
  };
  return { saving, error, deleteCandidate, confirmDelete,
    requestDelete: (event: CalendarEvent) => { if (!saving && !busy && isReady) { setError(""); setDeleteCandidate(event); } },
    cancelDelete: () => { if (!saving) { setError(""); setDeleteCandidate(null); } },
  };
}
