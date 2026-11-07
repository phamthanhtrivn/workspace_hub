"use client";

import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { usePomodoroSession } from "./pomodoro-session-provider";
import { PomodoroTaskPicker } from "./pomodoro-task-picker";
import { PomodoroFocusDialog } from "./pomodoro-focus-dialog";
import { MAX_POMODORO_NOTES_LENGTH } from "../utils/pomodoro-notes";

export function PomodoroActiveTaskCard({ twoColumns = false }: { twoColumns?: boolean }) {
  const { config, status, busy, notes, setNotes } = usePomodoroSession();
  const [creatingTask, setCreatingTask] = useState(false);
  const locked = status !== "IDLE";

  return <section aria-label="Session task selection" className="w-full min-w-0 space-y-5">

    <PomodoroTaskPicker open={!creatingTask} twoColumns={twoColumns} onCreateCalendarTask={() => setCreatingTask(true)} />
    {locked && <label className="block space-y-1.5 text-xs font-medium text-muted-foreground">Session notes
      <Textarea value={notes} onChange={event => setNotes(event.target.value)} placeholder="Notes for this focus session..."
        maxLength={MAX_POMODORO_NOTES_LENGTH} rows={2} disabled={busy} />
    </label>}
    {creatingTask && <PomodoroFocusDialog initialView="create" focusDurationMinutes={config.focusDuration} onClose={() => setCreatingTask(false)} />}
  </section>;
}
