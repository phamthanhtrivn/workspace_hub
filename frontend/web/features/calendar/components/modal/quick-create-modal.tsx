"use client";

import {
  AlignLeft,
  CalendarDays,
  ChevronDown,
  Clock3,
  ListTodo,
  MapPin,
  Paperclip,
  Target,
  Users,
  Video,
  X,
} from "lucide-react";
import { FormEventHandler, useEffect, useMemo, useState } from "react";
import { UseFormReturn, useWatch } from "react-hook-form";
import { useAppIntl } from "@/features/i18n/useAppIntl";
import { CalendarEventEditorValues } from "../../schemas/calendar-event-form.schema";
import {
  CalendarEventAttendeePayload,
  WorkspaceCalendar,
} from "../../types/calendar.types";
import {
  getDateInputValue,
  getTimeInputValue,
} from "../../utils/calendar-date.utils";
import { CalendarRecurrencePreset } from "../../utils/calendar-recurrence.utils";
import {
  createEndTimeOptions,
  createStartTimeOptions,
} from "../../utils/calendar-time-options";
import { AttendeePicker } from "../workspace/attendee-picker";
import { CalendarSelect } from "./calendar-select";

export type QuickCreateKind = "event" | "task" | "appointment";

interface QuickCreateModalProps {
  form: UseFormReturn<CalendarEventEditorValues>;
  calendars: WorkspaceCalendar[];
  kind: QuickCreateKind;
  recurrencePreset: CalendarRecurrencePreset;
  recurrenceOptions: Array<{ value: string; label: string }>;
  attendees: CalendarEventAttendeePayload[];
  submitting?: boolean;
  onKindChange: (kind: QuickCreateKind) => void;
  onAttendeesChange: (attendees: CalendarEventAttendeePayload[]) => void;
  onClose: () => void;
  onMoreOptions: () => void;
  onSubmitEvent: FormEventHandler<HTMLFormElement>;
  onSubmitUiOnly: (kind: Exclude<QuickCreateKind, "event">) => void;
  onUnavailableFeature: (feature: "conference") => void;
  onStartDateChange: (date: string) => void;
  onStartTimeChange: (time: string) => void;
  onEndDateTimeChange: (dateTime: string) => void;
  onAllDayChange: (checked: boolean) => void;
  onRecurrenceChange: (preset: CalendarRecurrencePreset) => void;
}

function QuickRow({
  icon,
  children,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-[2rem_minmax(0,1fr)] items-start gap-3">
      <span className="mt-2 grid h-8 w-8 place-items-center text-slate-600">
        {icon}
      </span>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

export function QuickCreateModal({
  form,
  calendars,
  kind,
  recurrencePreset,
  recurrenceOptions,
  attendees,
  submitting,
  onKindChange,
  onAttendeesChange,
  onClose,
  onMoreOptions,
  onSubmitEvent,
  onSubmitUiOnly,
  onUnavailableFeature,
  onStartDateChange,
  onStartTimeChange,
  onEndDateTimeChange,
  onAllDayChange,
  onRecurrenceChange,
}: QuickCreateModalProps) {
  const intl = useAppIntl();
  const { control, formState, getValues, register } = form;
  const allDayRegistration = register("allDay");
  const startAt = useWatch({ control, name: "startAt" });
  const endAt = useWatch({ control, name: "endAt" });
  const allDay = useWatch({ control, name: "allDay" });
  const calendarId = useWatch({ control, name: "calendarId" });
  const reminders = useWatch({ control, name: "reminders" });
  const [taskDeadline, setTaskDeadline] = useState(getDateInputValue(startAt));
  const [taskList, setTaskList] = useState("my-tasks");
  const [taskFiles, setTaskFiles] = useState<string[]>([]);
  const [appointmentDuration, setAppointmentDuration] = useState("30");
  const selectedCalendar =
    calendars.find((calendar) => calendar.id === calendarId) || calendars[0];
  const startTime = getTimeInputValue(startAt);
  const startTimeOptions = useMemo(
    () => createStartTimeOptions(intl.locale, startTime),
    [intl.locale, startTime],
  );
  const endTimeOptions = useMemo(
    () => createEndTimeOptions(startAt, endAt, intl.locale),
    [endAt, intl.locale, startAt],
  );
  const selectedEndTimeLabel = useMemo(
    () =>
      endTimeOptions
        .find((option) => option.value === endAt)
        ?.label.replace(/\s+\(.+\)$/, ""),
    [endAt, endTimeOptions],
  );

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

  const submitUiOnly: FormEventHandler<HTMLFormElement> = (event) => {
    event.preventDefault();
    if (!getValues("title").trim()) {
      form.setError("title", { message: "calendar.requiredFields" });
      return;
    }
    onSubmitUiOnly(kind as Exclude<QuickCreateKind, "event">);
  };

  const tabItems: Array<{ value: QuickCreateKind; labelId: string }> = [
    { value: "event", labelId: "calendar.quick.event" },
    { value: "task", labelId: "calendar.quick.task" },
    { value: "appointment", labelId: "calendar.quick.appointment" },
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/35 p-3 backdrop-blur-[1px] sm:p-5">
      <form
        onSubmit={kind === "event" ? onSubmitEvent : submitUiOnly}
        role="dialog"
        aria-modal="true"
        aria-labelledby="calendar-quick-create-heading"
        className="flex h-[min(42rem,94dvh)] w-full max-w-[32rem] flex-col overflow-hidden rounded-2xl bg-[#f3f6fb] shadow-[0_18px_48px_rgba(15,40,84,0.26)]"
      >
        <h2 id="calendar-quick-create-heading" className="sr-only">
          {intl.formatMessage({ id: "calendar.createEvent" })}
        </h2>
        <div className="flex h-11 shrink-0 items-center justify-between bg-[#e2e8f0] px-4 sm:px-5">
          <span className="h-1 w-5 rounded-full bg-slate-500/70" />
          <button
            type="button"
            onClick={onClose}
            className="grid h-9 w-9 cursor-pointer place-items-center rounded-full text-slate-600 transition hover:bg-slate-300/70 hover:text-slate-900"
            aria-label={intl.formatMessage({ id: "app.close" })}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="shrink-0 px-5 pt-4 sm:px-7 sm:pt-5">
          <input
            {...register("title")}
            id="calendar-quick-create-title"
            autoFocus
            aria-label={intl.formatMessage({ id: "calendar.quick.addTitle" })}
            placeholder={intl.formatMessage({ id: "calendar.quick.addTitle" })}
            aria-invalid={Boolean(formState.errors.title)}
            className="ml-10 w-[calc(100%-2.5rem)] border-0 border-b-[3px] border-blue-600 bg-transparent px-0 pb-1 text-2xl font-normal text-slate-800 outline-none placeholder:text-slate-600 focus:ring-0"
          />
          {formState.errors.title && (
            <p className="ml-10 mt-1 text-xs font-medium text-red-600">
              {intl.formatMessage({ id: "calendar.requiredFields" })}
            </p>
          )}

          <div className="ml-10 mt-3 flex flex-wrap gap-1.5" role="tablist">
            {tabItems.map((tab) => (
              <button
                key={tab.value}
                type="button"
                role="tab"
                aria-selected={kind === tab.value}
                onClick={() => onKindChange(tab.value)}
                className={`cursor-pointer rounded-lg px-3 py-2 text-sm font-medium transition ${
                  kind === tab.value
                    ? "bg-sky-100 text-blue-800"
                    : "text-slate-700 hover:bg-slate-200/70"
                }`}
              >
                {intl.formatMessage({ id: tab.labelId })}
              </button>
            ))}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-3 sm:px-7">
          <div className="mt-4 space-y-2.5">
            <QuickRow icon={<Clock3 className="h-5 w-5" />}>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg px-1 py-1.5 hover:bg-slate-200/50">
                <input
                  type="date"
                  aria-label={intl.formatMessage({ id: "calendar.start" })}
                  value={getDateInputValue(startAt)}
                  onChange={(event) => onStartDateChange(event.target.value)}
                  className="h-8 cursor-pointer border-0 bg-transparent text-sm font-medium text-slate-700 outline-none"
                />
                {!allDay && (
                  <>
                    <CalendarSelect
                      value={startTime}
                      options={startTimeOptions}
                      ariaLabel={intl.formatMessage({ id: "calendar.start" })}
                      onChange={onStartTimeChange}
                      triggerClassName="h-8 min-w-[6.6rem] bg-slate-200/80 px-2.5"
                      popupClassName="min-w-[11.75rem]"
                    />
                    {kind !== "appointment" && (
                      <>
                        <span className="text-sm text-slate-500">-</span>
                        <CalendarSelect
                          value={endAt}
                          options={endTimeOptions}
                          ariaLabel={intl.formatMessage({ id: "calendar.end" })}
                          onChange={onEndDateTimeChange}
                          triggerLabel={selectedEndTimeLabel}
                          triggerClassName="h-8 min-w-[6.6rem] bg-slate-200/80 px-2.5"
                          popupClassName="min-w-[11.75rem]"
                        />
                      </>
                    )}
                  </>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 px-2 text-xs text-slate-500">
                <label className="inline-flex cursor-pointer items-center gap-1.5">
                  <input
                    {...allDayRegistration}
                    type="checkbox"
                    aria-label={intl.formatMessage({ id: "calendar.allDay" })}
                    checked={allDay}
                    onChange={(event) => {
                      void allDayRegistration.onChange(event);
                      onAllDayChange(event.target.checked);
                    }}
                    className="h-3.5 w-3.5 rounded border-slate-300"
                  />
                  {intl.formatMessage({ id: "calendar.allDay" })}
                </label>
                {kind === "event" && (
                  <>
                    <span>·</span>
                    <span>
                      {intl.formatMessage({ id: "calendar.quick.timeZone" })}
                    </span>
                  </>
                )}
              </div>
              {kind !== "appointment" && (
                <div className="mt-1 px-1">
                  <CalendarSelect
                    value={recurrencePreset}
                    options={recurrenceOptions}
                    ariaLabel={intl.formatMessage({ id: "calendar.recurrence" })}
                    onChange={(value) =>
                      onRecurrenceChange(value as CalendarRecurrencePreset)
                    }
                    alignItemWithTrigger={false}
                    triggerClassName="h-9 min-w-[10.5rem] justify-between bg-slate-200/80 px-3 text-slate-600"
                    popupClassName="min-w-[15.5rem]"
                  />
                </div>
              )}
            </QuickRow>

            {kind === "event" && (
              <>
                <QuickRow icon={<Users className="h-5 w-5" />}>
                  <AttendeePicker
                    compact
                    attendees={attendees}
                    onChange={onAttendeesChange}
                  />
                </QuickRow>
                <QuickRow icon={<Video className="h-5 w-5" />}>
                  <button
                    type="button"
                    onClick={() => onUnavailableFeature("conference")}
                    className="w-full cursor-pointer rounded-lg px-2 py-2.5 text-left text-sm text-slate-600 transition hover:bg-slate-200/60"
                  >
                    {intl.formatMessage({ id: "calendar.quick.addConference" })}
                  </button>
                </QuickRow>
                <QuickRow icon={<MapPin className="h-5 w-5" />}>
                  <input
                    {...register("location")}
                    aria-label={intl.formatMessage({ id: "calendar.location" })}
                    placeholder={intl.formatMessage({ id: "calendar.quick.addLocation" })}
                    className="w-full rounded-lg border-0 bg-transparent px-2 py-2.5 text-sm text-slate-700 outline-none transition placeholder:text-slate-600 hover:bg-slate-200/60 focus:bg-white"
                  />
                </QuickRow>
              </>
            )}

            {kind === "task" && (
              <>
                <QuickRow icon={<Target className="h-5 w-5" />}>
                  <label className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-slate-200/60">
                    <span className="text-sm text-slate-600">
                      {intl.formatMessage({ id: "calendar.quick.deadline" })}
                    </span>
                    <input
                      type="date"
                      aria-label={intl.formatMessage({ id: "calendar.quick.deadline" })}
                      value={taskDeadline}
                      onChange={(event) => setTaskDeadline(event.target.value)}
                      className="min-w-0 flex-1 border-0 bg-transparent text-sm text-slate-700 outline-none"
                    />
                  </label>
                </QuickRow>
                <QuickRow icon={<ListTodo className="h-5 w-5" />}>
                  <select
                    value={taskList}
                    aria-label={intl.formatMessage({ id: "calendar.quick.myTasks" })}
                    onChange={(event) => setTaskList(event.target.value)}
                    className="w-full cursor-pointer rounded-lg border-0 bg-slate-200 px-3 py-2.5 text-sm text-slate-700 outline-none"
                  >
                    <option value="my-tasks">
                      {intl.formatMessage({ id: "calendar.quick.myTasks" })}
                    </option>
                    <option value="project-tasks">
                      {intl.formatMessage({ id: "calendar.quick.projectTasks" })}
                    </option>
                  </select>
                </QuickRow>
              </>
            )}

            {kind === "appointment" && (
              <>
                <QuickRow icon={<Target className="h-5 w-5" />}>
                  <label className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-slate-200/60">
                    <span className="text-sm text-slate-600">
                      {intl.formatMessage({ id: "calendar.quick.duration" })}
                    </span>
                    <select
                      value={appointmentDuration}
                      aria-label={intl.formatMessage({ id: "calendar.quick.duration" })}
                      onChange={(event) => setAppointmentDuration(event.target.value)}
                      className="cursor-pointer border-0 bg-transparent text-sm text-slate-700 outline-none"
                    >
                      {[15, 30, 45, 60].map((minutes) => (
                        <option key={minutes} value={minutes}>
                          {intl.formatMessage(
                            { id: "calendar.quick.minutes" },
                            { minutes },
                          )}
                        </option>
                      ))}
                    </select>
                  </label>
                </QuickRow>
                <QuickRow icon={<Users className="h-5 w-5" />}>
                  <p className="rounded-lg px-2 py-2.5 text-sm text-slate-600">
                    {intl.formatMessage({ id: "calendar.quick.bookingPage" })}
                  </p>
                </QuickRow>
                <QuickRow icon={<MapPin className="h-5 w-5" />}>
                  <input
                    {...register("location")}
                    aria-label={intl.formatMessage({ id: "calendar.location" })}
                    placeholder={intl.formatMessage({ id: "calendar.quick.addLocation" })}
                    className="w-full rounded-lg border-0 bg-transparent px-2 py-2.5 text-sm text-slate-700 outline-none transition placeholder:text-slate-600 hover:bg-slate-200/60 focus:bg-white"
                  />
                </QuickRow>
              </>
            )}

            <QuickRow icon={<AlignLeft className="h-5 w-5" />}>
              <textarea
                {...register("description")}
                aria-label={intl.formatMessage({ id: "calendar.quick.addDescription" })}
                rows={kind === "event" ? 1 : 2}
                placeholder={intl.formatMessage({
                  id:
                    kind === "event"
                      ? "calendar.quick.addDescriptionAttachment"
                      : "calendar.quick.addDescription",
                })}
                className="w-full resize-none rounded-lg border-0 bg-transparent px-2 py-2.5 text-sm text-slate-700 outline-none transition placeholder:text-slate-600 hover:bg-slate-200/60 focus:bg-white"
              />
            </QuickRow>

            {kind === "task" && (
              <QuickRow icon={<Paperclip className="h-5 w-5" />}>
                <label className="block cursor-pointer rounded-lg px-2 py-2.5 text-sm text-slate-600 transition hover:bg-slate-200/60">
                  <input
                    type="file"
                    multiple
                    className="sr-only"
                    aria-label={intl.formatMessage({ id: "calendar.quick.addFile" })}
                    onChange={(event) =>
                      setTaskFiles(
                        Array.from(event.target.files || []).map(
                          (file) => file.name,
                        ),
                      )
                    }
                  />
                  <span className="font-medium">
                    {intl.formatMessage({ id: "calendar.quick.addFile" })}
                  </span>
                  {taskFiles.length > 0 && (
                    <span className="mt-1 block truncate text-xs text-slate-500">
                      {taskFiles.join(", ")}
                    </span>
                  )}
                </label>
              </QuickRow>
            )}

            <QuickRow icon={<CalendarDays className="h-5 w-5" />}>
              <div className="rounded-lg px-2 py-2 hover:bg-slate-200/50">
                <div className="flex items-center gap-2">
                  <select
                    {...register("calendarId")}
                    aria-label={intl.formatMessage({ id: "nav.calendar" })}
                    className="min-w-0 max-w-full cursor-pointer border-0 bg-transparent text-sm font-medium text-slate-700 outline-none"
                  >
                    {calendars.map((calendar) => (
                      <option key={calendar.id} value={calendar.id}>
                        {calendar.name}
                      </option>
                    ))}
                  </select>
                  <span
                    className="h-3.5 w-3.5 shrink-0 rounded-full"
                    style={{ backgroundColor: selectedCalendar?.color || "#2563eb" }}
                  />
                </div>
                <p className="mt-0.5 truncate text-xs text-slate-500">
                  {kind === "event"
                    ? intl.formatMessage(
                        { id: "calendar.quick.eventSummary" },
                        { reminder: reminders[0]?.minutesBefore ?? 10 },
                      )
                    : intl.formatMessage({ id: "calendar.quick.uiOnly" })}
                </p>
              </div>
            </QuickRow>
          </div>
        </div>

        <div className="flex shrink-0 items-center justify-end gap-2 px-5 pb-4 pt-2 sm:px-7">
          {kind === "event" && (
            <button
              type="button"
              onClick={onMoreOptions}
              className="inline-flex cursor-pointer items-center gap-1 rounded-full px-3 py-2 text-sm font-semibold text-blue-700 transition hover:bg-blue-100"
            >
              {intl.formatMessage({ id: "calendar.moreOptions" })}
              <ChevronDown className="h-4 w-4" />
            </button>
          )}
          <button
            type="submit"
            disabled={submitting || formState.isSubmitting}
            className="cursor-pointer rounded-full bg-blue-700 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-800 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting
              ? intl.formatMessage({ id: "app.saving" })
              : intl.formatMessage({ id: "app.save" })}
          </button>
        </div>
      </form>
    </div>
  );
}
