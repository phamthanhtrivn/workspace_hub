"use client";

import { useState } from "react";
import { usePomodoroSession } from "./pomodoro-session-provider";
import { PomodoroTaskPicker } from "./pomodoro-task-picker";
import { PomodoroFocusDialog } from "./pomodoro-focus-dialog";

export function PomodoroActiveTaskCard({
  twoColumns = false,
}: {
  twoColumns?: boolean;
}) {
  const { config } = usePomodoroSession();
  const [creatingTask, setCreatingTask] = useState(false);

  return (
    <section
      aria-label="Session task selection"
      className="flex w-full min-w-0 flex-1 flex-col gap-5"
    >
      <PomodoroTaskPicker
        open={!creatingTask}
        twoColumns={twoColumns}
        onCreateCalendarTask={() => setCreatingTask(true)}
      />
      {creatingTask && (
        <PomodoroFocusDialog
          initialView="create"
          focusDurationMinutes={config.focusDuration}
          onClose={() => setCreatingTask(false)}
        />
      )}
    </section>
  );
}
