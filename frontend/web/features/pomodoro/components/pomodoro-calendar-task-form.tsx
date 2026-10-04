"use client";

import { useState, useId, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { ListTodo } from "lucide-react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { useAppSelector } from "@/store/store";
import { calendarKeys, useCalendarCalendars } from "@/features/calendar/hooks/use-calendar-queries";
import { useCalendarEventTime } from "@/features/calendar/hooks/use-calendar-event-time";
import { calendarEventFormSchema, type CalendarEventEditorValues } from "@/features/calendar/schemas/calendar-event-form.schema";
import { createCalendarEventFormDefaults } from "@/features/calendar/utils/calendar-event-form.utils";
import { CalendarTimeFields, QuickRow } from "@/features/calendar/components/modal/calendar-time-fields";
import { CalendarTaskDeadlineFields } from "@/features/calendar/components/modal/calendar-task-deadline-fields";
import { EventSourceType, type CalendarTaskDeadline } from "@/features/calendar/types/calendar.types";
import { CALENDAR_DEFAULT_TASK_COLOR, CALENDAR_MIN_EVENT_DURATION_MS } from "@/features/calendar/types/calendar.constants";
import { CALENDAR_FORM_COPY as copy } from "@/features/calendar/constants/calendar-form-copy";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { getPersonalTaskCalendar } from "../utils/personal-task-calendar";
import { defaultFocusStart } from "../utils/schedule-task";
import { POMODORO_TASK_MESSAGES, POMODORO_TASK_SETTINGS } from "../constants/pomodoro-task";
import { usePomodoroSessionActions } from "./pomodoro-session-provider";
import { createCalendarFocusTask } from "../api/focus-tasks.api";
import type { PomodoroActiveTask } from "../types/pomodoro";
import { isCalendarFocusEligible, toCalendarFocusTask, sameFocusTask } from "../utils/focus-task";

export function PomodoroCalendarTaskForm({ focusDurationMinutes, onCreated, onSavingChange }: {
  focusDurationMinutes: number;
  onCreated: () => void;
  onSavingChange?: (saving: boolean) => void;
}) {
  const formId = useId();
  const userId = useAppSelector((state) => state.auth.userId);
  const { data: calendars = [], isLoading, isError, refetch } = useCalendarCalendars();
  const defaultCalendarId = getPersonalTaskCalendar(calendars, userId)?.id ?? "";
  const [defaults] = useState(() => {
    const startAt = new Date(defaultFocusStart());
    return createCalendarEventFormDefaults({ calendarId: "", draft: {
      startAt, endAt: new Date(startAt.getTime() + Math.max(CALENDAR_MIN_EVENT_DURATION_MS, POMODORO_TASK_SETTINGS.defaultCalendarSessions * focusDurationMinutes * 60_000)),
      sourceType: EventSourceType.TASK,
    } }).values;
  });
  const form = useForm<CalendarEventEditorValues>({ resolver: zodResolver(calendarEventFormSchema), defaultValues: { ...defaults, calendarId: defaultCalendarId, reminders: [] } });
  const time = useCalendarEventTime(form);
  const [deadline, setDeadline] = useState<CalendarTaskDeadline>({ enabled: false, date: "", time: "" });
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const creatingRef = useRef(false);
  const [createdTask, setCreatedTask] = useState<PomodoroActiveTask | null>(null);
  const [createdEligible, setCreatedEligible] = useState(true);
  const { startFocus, busy, activeTask, status } = usePomodoroSessionActions();
  const queryClient = useQueryClient();
  const { register, setValue, formState: { errors } } = form;

  useEffect(() => {
    setValue("calendarId", defaultCalendarId);
  }, [defaultCalendarId, setValue]);
  useEffect(() => {
    if (createdTask && sameFocusTask(createdTask, activeTask) && status === "RUNNING") onCreated();
  }, [createdTask, activeTask, status, onCreated]);

  const submit = async (values: CalendarEventEditorValues) => {
    if (creatingRef.current || busy || !userId) return;
    creatingRef.current = true;
    setCreating(true);
    onSavingChange?.(true);
    setError("");
    try {
      let target = createdTask;
      if (!target) {
        const event = await createCalendarFocusTask(values, userId, deadline);
        target = toCalendarFocusTask(event);
        setCreatedTask(target);
        void queryClient.invalidateQueries({ queryKey: calendarKeys.all });
        void queryClient.invalidateQueries({ queryKey: ["pomodoro", "focus-tasks"] });
        if (!isCalendarFocusEligible(event, userId)) {
          setCreatedEligible(false);
          setError(POMODORO_TASK_MESSAGES.savedTaskUnavailable);
          return;
        }
      }
      await startFocus(target);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : POMODORO_TASK_MESSAGES.createFailed);
    } finally { creatingRef.current = false; setCreating(false); onSavingChange?.(false); }
  };
  const locked = creating || busy || Boolean(createdTask);

  return <form onSubmit={(event) => void form.handleSubmit(submit)(event)} className="space-y-5">
    <p className="text-xs text-slate-500">Add a personal task to My tasks and start focusing on it.</p>
    <fieldset disabled={locked} className="min-w-0 space-y-5">
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-slate-600" htmlFor={`${formId}-title`}>Task title</label>
        <Input {...register("title")} id={`${formId}-title`} data-modal-initial-focus placeholder="What would you like to work on?"
          required maxLength={POMODORO_TASK_SETTINGS.maxGoalTitleLength} aria-invalid={Boolean(errors.title)} aria-describedby={errors.title ? `${formId}-title-error` : undefined} />
        {errors.title && <p id={`${formId}-title-error`} role="alert" className="text-xs text-rose-600">{errors.title.message}</p>}
      </div>
      <QuickRow icon={<ListTodo className="h-5 w-5" style={{ color: CALENDAR_DEFAULT_TASK_COLOR }} />}>
        <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-2xs">
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: CALENDAR_DEFAULT_TASK_COLOR }} />
            <span className="text-sm font-semibold text-slate-700">{copy.task}</span>
          </div>
          <p className="mt-0.5 text-xs text-slate-500">{copy.myTasks}</p>
        </div>
      </QuickRow>
      <CalendarTimeFields form={form} onStartDateChange={time.handleStartDateChange} onEndDateChange={time.handleEndDateChange}
        onStartTimeChange={time.handleStartTimeChange} onEndDateTimeChange={time.handleEndDateTimeChange} onAllDayChange={time.handleAllDayChange} />
      {errors.endAt && <p role="alert" className="text-xs text-rose-600">{errors.endAt.message}</p>}
      <CalendarTaskDeadlineFields value={deadline} onChange={setDeadline} />
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-slate-600" htmlFor={`${formId}-description`}>Description (optional)</label>
        <Textarea {...register("description")} id={`${formId}-description`} rows={3} maxLength={POMODORO_TASK_SETTINGS.maxDescriptionLength}
          aria-invalid={Boolean(errors.description)} aria-describedby={errors.description ? `${formId}-description-error` : undefined} placeholder="Add task details…" />
        {errors.description && <p id={`${formId}-description-error`} role="alert" className="text-xs text-rose-600">{errors.description.message}</p>}
      </div>
    </fieldset>
    {!isLoading && !isError && !defaultCalendarId && <p role="status" className="text-xs text-slate-500">{POMODORO_TASK_MESSAGES.personalCalendarRequired}</p>}
    {isError && <p role="alert" className="text-xs text-rose-600">Unable to load your personal task list. <Button type="button" variant="link" size="sm" onClick={() => void refetch()}>Retry</Button></p>}
    {createdTask && <p role="status" className="text-xs text-slate-500">Task saved to My tasks. Your current focus is kept until you confirm the switch.</p>}
    {error && <p role="alert" className="text-xs text-rose-600">{error}</p>}
    <Button type="submit" className="w-full" disabled={creating || busy || !createdEligible || isLoading || isError || !defaultCalendarId}>
      {creating ? "Preparing focus…" : createdTask ? "Start created task" : "Create task & start focus"}
    </Button>
  </form>;
}
