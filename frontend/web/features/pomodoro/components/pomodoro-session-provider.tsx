"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAppSelector } from "@/store/store";
import { calendarKeys } from "@/features/calendar/hooks/use-calendar-queries";
import { usePomodoroTimer } from "../hooks/use-pomodoro-timer";
import { usePomodoroTaskActions, taskActionErrorMessage } from "../hooks/use-pomodoro-task-actions";
import { prepareFocusTask, validateFocusTask } from "../api/focus-tasks.api";
import { sameFocusTask } from "../utils/focus-task";
import { POMODORO_TASK_MESSAGES } from "../constants/pomodoro-task";
import type { PomodoroActiveTask } from "../types/pomodoro";
import { AlertDialog, AlertDialogContent } from "@/components/ui/alert-dialog";
import { PomodoroFocusSwitchConfirmation } from "./pomodoro-focus-switch-confirmation";

type Timer = ReturnType<typeof usePomodoroTimer>;
interface FocusSwitchActions {
  pendingFocusTarget: { task: PomodoroActiveTask | null } | null;
  confirmFocusSwitch: () => Promise<boolean>;
  cancelFocusSwitch: () => void;
  setFocusDialogOpen: (open: boolean) => void;
}
type Session = Timer & ReturnType<typeof usePomodoroTaskActions> & FocusSwitchActions & {
  startFocus: (task: PomodoroActiveTask) => Promise<boolean>;
  startFreeFocus: () => Promise<boolean>;
  focusRevision: number;
  busy: boolean;
};
type Actions = FocusSwitchActions & Pick<Session, "startFocus" | "startFreeFocus" | "focusRevision" | "activeTask" | "status" | "busy" | "isReady" | "sessionRevision" | "taskRevision" | "stopSession" | "selectTask">;
const SessionContext = createContext<Session | null>(null);
const ActionsContext = createContext<Actions | null>(null);

function UserPomodoroSessionProvider({ userId, children }: { userId: string; children: ReactNode }) {
  const timer = usePomodoroTimer(userId);
  const taskActions = usePomodoroTaskActions(timer.finishActiveTask);
  const queryClient = useQueryClient();
  // The wrapper distinguishes a request for free focus from no pending request.
  const [pendingTarget, setPendingTarget] = useState<{ task: PomodoroActiveTask | null } | null>(null);
  const [focusDialogOpen, setFocusDialogOpen] = useState(false);
  const [focusRevision, setFocusRevision] = useState(0);
  const [validating, setValidating] = useState(false);
  const inFlight = useRef(false);
  const busy = validating || timer.isTaskActionPending || (timer.status === "RUNNING" && timer.timeLeft === 0);
  const { isReady, isTaskActionPending, status, mode, activeTask, updateActiveTask, resume: resumeTimer, beginFocusTask, beginFreeFocus, start: startTimer } = timer;

  const refreshTasks = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ["projects"] });
    void queryClient.invalidateQueries({ queryKey: calendarKeys.all });
    void queryClient.invalidateQueries({ queryKey: ["pomodoro", "focus-tasks"] });
  }, [queryClient]);

  const executeFocus = useCallback(async (target: PomodoroActiveTask | null, replace = false) => {
    if (!isReady) throw new Error(POMODORO_TASK_MESSAGES.notReady);
    if (inFlight.current || isTaskActionPending) throw new Error(POMODORO_TASK_MESSAGES.busy);
    if (!replace && status !== "IDLE" && (!sameFocusTask(activeTask, target) || mode !== "FOCUS")) {
      setPendingTarget({ task: target });
      return false;
    }
    inFlight.current = true;
    setValidating(true);
    try {
      const validated = target ? await validateFocusTask(target, userId) : null;
      if (sameFocusTask(activeTask, validated) && mode === "FOCUS" && status !== "IDLE") {
        if (validated) {
          const prepared = await prepareFocusTask(validated, userId);
          updateActiveTask({ ...prepared, completedPomodoros: activeTask?.completedPomodoros });
        }
        if (status === "PAUSED") resumeTimer();
      } else if (validated) {
        await beginFocusTask(validated, (task) => prepareFocusTask(task, userId));
      } else {
        await beginFreeFocus();
      }
      if (validated) refreshTasks();
      setPendingTarget(null);
      setFocusRevision((revision) => revision + 1);
      return true;
    } finally {
      inFlight.current = false;
      setValidating(false);
    }
  }, [isReady, isTaskActionPending, status, mode, activeTask, updateActiveTask, resumeTimer, beginFocusTask, beginFreeFocus, userId, refreshTasks]);

  const startFocus = useCallback(async (target: PomodoroActiveTask) => {
    try { return await executeFocus(target); }
    catch (error) { toast.error(taskActionErrorMessage(error)); return false; }
  }, [executeFocus]);

  const startFreeFocus = useCallback(async () => {
    try { return await executeFocus(null); }
    catch (error) { toast.error(taskActionErrorMessage(error)); return false; }
  }, [executeFocus]);

  const cancelFocusSwitch = useCallback(() => {
    if (!busy) setPendingTarget(null);
  }, [busy]);
  const confirmFocusSwitch = useCallback(async () => {
    if (!pendingTarget || busy) return false;
    try { return await executeFocus(pendingTarget.task, true); }
    catch (error) { toast.error(taskActionErrorMessage(error)); return false; }
  }, [pendingTarget, busy, executeFocus]);

  const start = useCallback(() => {
    if (mode === "FOCUS") {
      if (activeTask) void startFocus(activeTask);
      else void startFreeFocus();
    }
    else startTimer();
  }, [mode, activeTask, startTimer, startFocus, startFreeFocus]);
  const resume = useCallback(() => {
    if (mode === "FOCUS") {
      if (activeTask) void startFocus(activeTask);
      else void startFreeFocus();
    }
    else resumeTimer();
  }, [mode, activeTask, resumeTimer, startFocus, startFreeFocus]);

  const actions = useMemo<Actions>(() => ({ startFocus, startFreeFocus, focusRevision, activeTask: timer.activeTask, status: timer.status, busy,
    pendingFocusTarget: pendingTarget, confirmFocusSwitch, cancelFocusSwitch, setFocusDialogOpen,
    isReady: timer.isReady, sessionRevision: timer.sessionRevision, taskRevision: taskActions.taskRevision,
    stopSession: timer.stopSession, selectTask: timer.selectTask }),
  [startFocus, startFreeFocus, focusRevision, timer.activeTask, timer.status, busy, timer.isReady, timer.sessionRevision, taskActions.taskRevision, timer.stopSession, timer.selectTask, pendingTarget, confirmFocusSwitch, cancelFocusSwitch]);

  return (
    <ActionsContext.Provider value={actions}>
      <SessionContext.Provider value={{ ...timer, ...taskActions, ...actions, start, resume }}>
        {children}
        <AlertDialog open={Boolean(pendingTarget) && !focusDialogOpen} onOpenChange={(open) => { if (!open) cancelFocusSwitch(); }}>
          <AlertDialogContent showCloseButton={false} aria-label="Switch focus task">
            <PomodoroFocusSwitchConfirmation />
          </AlertDialogContent>
        </AlertDialog>
      </SessionContext.Provider>
    </ActionsContext.Provider>
  );
}

export function PomodoroSessionProvider({ children }: { children: ReactNode }) {
  const userId = useAppSelector((state) => state.auth.userId);
  return userId ? <UserPomodoroSessionProvider key={userId} userId={userId}>{children}</UserPomodoroSessionProvider> : children;
}

export function usePomodoroSession() {
  const session = useContext(SessionContext);
  if (!session) throw new Error("PomodoroSessionProvider is required");
  return session;
}

export function usePomodoroSessionActions() {
  const session = useContext(ActionsContext);
  if (!session) throw new Error("PomodoroSessionProvider is required");
  return session;
}
