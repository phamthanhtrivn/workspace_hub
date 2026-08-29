"use client";

import { useState } from "react";
import { Bell, ChevronDown, FileText, Plus, Trash2, X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import type { FieldErrors } from "react-hook-form";
import { toast } from "sonner";
import { useAppIntl } from "@/features/i18n/useAppIntl";
import { documentsApi } from "@/features/documents/api/documents.api";
import { DocumentItemType } from "@/features/documents/types/documents.enums";
import {
  CalendarEventAttendeePayload,
  CalendarEvent,
  CalendarEventDraft,
  CalendarEventFormValues,
  ReminderMethod,
  EventStatus,
  EventVisibility,
  RecurrenceScope,
  WorkspaceCalendar,
} from "../../types/calendar.types";
import {
  CALENDAR_COLOR_CHOICES,
  CALENDAR_DEFAULT_EVENT_COLOR,
  CALENDAR_RECURRENCE_PRESET_VALUES,
  CALENDAR_REMINDER_OPTIONS,
} from "../../types/calendar.constants";
import {
  composeDateTimeLocal,
  ensureMinimumEventEndAt,
  fromDateTimeLocal,
  getDateInputValue,
  getTimeInputValue,
  hasMinimumEventDuration,
  toDateTimeLocal,
} from "../../utils/calendar-date.utils";
import {
  CalendarRecurrencePreset,
  buildCustomRecurrenceRule,
  getMonthDayName,
  getPresetRecurrenceRule,
  getRecurrencePresetFromRule,
  getWeekdayName,
  parseCustomRecurrenceRule,
} from "../../utils/calendar-recurrence.utils";
import { CustomRecurrenceModal } from "./custom-recurrence-modal";
import { CalendarColorPicker } from "../sidebar/calendar-style-fields";
import { AttendeePicker } from "../workspace/attendee-picker";
import {
  CalendarEventEditorValues,
  calendarEventFormSchema,
} from "../../schemas/calendar-event-form.schema";
import {
  QuickCreateKind,
  QuickCreateModal,
} from "./quick-create-modal";

export function EventFormModal({
  open,
  calendars,
  initialDraft,
  event,
  onClose,
  onSubmit,
  submitting,
}: {
  open: boolean;
  calendars: WorkspaceCalendar[];
  initialDraft: CalendarEventDraft | null;
  event?: CalendarEvent | null;
  onClose: () => void;
  onSubmit: (values: CalendarEventFormValues) => Promise<void>;
  submitting?: boolean;
}) {
  const intl = useAppIntl();
  const defaultCalendar = calendars.find((calendar) => calendar.isDefault) || calendars[0];
  const initialCalendarId =
    event?.calendarId || initialDraft?.calendarId || defaultCalendar?.id || "";
  const defaultStart = event?.startAt
    ? new Date(event.startAt)
    : initialDraft?.startAt || new Date();
  const defaultEnd = (() => {
    if (event?.endAt) return new Date(event.endAt);
    if (initialDraft?.endAt) return initialDraft.endAt;
    const next = new Date(defaultStart);
    next.setHours(next.getHours() + 1);
    return next;
  })();

  const form = useForm<CalendarEventEditorValues>({
    resolver: zodResolver(calendarEventFormSchema),
    defaultValues: {
      calendarId: initialCalendarId,
      title: event?.title || "",
      description: event?.description || "",
      location: event?.location || "",
      startAt: toDateTimeLocal(defaultStart),
      endAt: toDateTimeLocal(defaultEnd),
      allDay: event?.allDay || initialDraft?.allDay || false,
      useEventColor: Boolean(event?.color),
      color: event?.color || null,
      visibility: event?.visibility ?? EventVisibility.DEFAULT,
      status: event?.status ?? EventStatus.CONFIRMED,
      recurrenceScope: RecurrenceScope.THIS,
      reminders:
        event?.reminders?.map(({ minutesBefore, method }) => ({
          minutesBefore,
          method,
        })) ?? [{ minutesBefore: 10, method: ReminderMethod.ALERT }],
    },
  });
  const {
    control,
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
    setValue,
  } = form;
  const startAt = useWatch({ control, name: "startAt" });
  const endAt = useWatch({ control, name: "endAt" });
  const allDay = useWatch({ control, name: "allDay" });
  const useEventColor = useWatch({ control, name: "useEventColor" });
  const color = useWatch({ control, name: "color" });
  const {
    fields: reminderFields,
    append: appendReminder,
    remove: removeReminder,
  } = useFieldArray({ control, name: "reminders" });
  const [showCustomEventColor, setShowCustomEventColor] = useState(
    Boolean(
      event?.color &&
        !(CALENDAR_COLOR_CHOICES as readonly string[]).includes(event.color),
    ),
  );
  const [attendees, setAttendees] = useState<CalendarEventAttendeePayload[]>(
    () =>
      (event?.attendees || []).map(({ userId, optional }) => ({
        userId,
        optional: optional ?? false,
      })),
  );
  const [documentIds, setDocumentIds] = useState<string[]>(
    event?.documentIds ?? [],
  );
  const [documentSearch, setDocumentSearch] = useState("");
  const [recurrenceRule, setRecurrenceRule] = useState<string | null>(
    event?.recurrenceRule || null,
  );
  const [recurrencePreset, setRecurrencePreset] =
    useState<CalendarRecurrencePreset>(
      getRecurrencePresetFromRule(
        event?.recurrenceRule,
        event?.startAt ? new Date(event.startAt) : defaultStart,
      ),
    );
  const [customRecurrence, setCustomRecurrence] = useState(
    parseCustomRecurrenceRule(
      event?.recurrenceRule,
      event?.startAt ? new Date(event.startAt) : defaultStart,
    ),
  );
  const [showCustomRecurrence, setShowCustomRecurrence] = useState(false);
  const [showMoreOptions, setShowMoreOptions] = useState(Boolean(event));
  const [quickCreateKind, setQuickCreateKind] =
    useState<QuickCreateKind>("event");
  const documentsQuery = useQuery({
    queryKey: ["calendar", "document-options", documentSearch],
    queryFn: () =>
      documentsApi.getDocuments({ page: 1, limit: 50, search: documentSearch }),
    enabled: open,
  });

  const handleStartDateChange = (nextDate: string) => {
    const nextStartAt = composeDateTimeLocal(
      nextDate,
      allDay ? "00:00" : getTimeInputValue(startAt),
    );
    const nextEndAt = allDay
      ? composeDateTimeLocal(getDateInputValue(endAt), "23:59")
      : endAt;

    setValue("startAt", nextStartAt, { shouldDirty: true });
    setValue(
      "endAt",
      hasMinimumEventDuration(nextStartAt, nextEndAt)
        ? nextEndAt
        : allDay
          ? composeDateTimeLocal(nextDate, "23:59")
          : ensureMinimumEventEndAt(nextStartAt, nextEndAt),
      { shouldDirty: true, shouldValidate: true },
    );
  };

  const handleStartTimeChange = (nextTime: string) => {
    const nextStartAt = composeDateTimeLocal(
      getDateInputValue(startAt),
      nextTime,
    );
    setValue("startAt", nextStartAt, { shouldDirty: true });
    setValue("endAt", ensureMinimumEventEndAt(nextStartAt, endAt), {
      shouldDirty: true,
      shouldValidate: true,
    });
  };

  const handleEndDateChange = (nextDate: string) => {
    const nextEndAt = composeDateTimeLocal(
      nextDate,
      allDay ? "23:59" : getTimeInputValue(endAt),
    );
    if (!hasMinimumEventDuration(startAt, nextEndAt)) {
      toast.error(intl.formatMessage({ id: "calendar.invalidMinimumRange" }));
      return;
    }
    setValue("endAt", nextEndAt, { shouldDirty: true, shouldValidate: true });
  };

  const handleEndTimeChange = (nextTime: string) => {
    const nextEndAt = composeDateTimeLocal(getDateInputValue(endAt), nextTime);
    if (!hasMinimumEventDuration(startAt, nextEndAt)) {
      toast.error(intl.formatMessage({ id: "calendar.invalidMinimumRange" }));
      return;
    }
    setValue("endAt", nextEndAt, { shouldDirty: true, shouldValidate: true });
  };

  const handleAllDayChange = (checked: boolean) => {
    setValue("allDay", checked, { shouldDirty: true });
    if (!checked) return;

    const nextStartAt = composeDateTimeLocal(getDateInputValue(startAt), "00:00");
    const nextEndAt = composeDateTimeLocal(getDateInputValue(endAt), "23:59");

    setValue("startAt", nextStartAt, { shouldDirty: true });
    setValue(
      "endAt",
      hasMinimumEventDuration(nextStartAt, nextEndAt)
        ? nextEndAt
        : composeDateTimeLocal(getDateInputValue(startAt), "23:59"),
      { shouldDirty: true, shouldValidate: true },
    );
  };

  const handleRecurrenceChange = (nextPreset: CalendarRecurrencePreset) => {
    if (nextPreset === CALENDAR_RECURRENCE_PRESET_VALUES.CUSTOM) {
      setShowCustomRecurrence(true);
      return;
    }

    setRecurrencePreset(nextPreset);
    setRecurrenceRule(getPresetRecurrenceRule(nextPreset, new Date(startAt)));
  };

  const handleCustomRecurrenceSave = (nextRecurrence: typeof customRecurrence) => {
    setCustomRecurrence(nextRecurrence);
    setRecurrencePreset(CALENDAR_RECURRENCE_PRESET_VALUES.CUSTOM);
    setRecurrenceRule(buildCustomRecurrenceRule(nextRecurrence));
    setShowCustomRecurrence(false);
  };

  if (!open) return null;

  const submitValidForm = async (values: CalendarEventEditorValues) => {
    const startDate = new Date(values.startAt);
    const normalizedReminders = values.reminders.filter(
      (reminder) =>
        Number.isFinite(reminder.minutesBefore) && reminder.minutesBefore >= 0,
    );
    const effectiveRecurrenceRule =
      recurrencePreset === CALENDAR_RECURRENCE_PRESET_VALUES.NONE ||
      recurrencePreset === CALENDAR_RECURRENCE_PRESET_VALUES.CUSTOM
        ? recurrenceRule
        : getPresetRecurrenceRule(recurrencePreset, startDate);

    await onSubmit({
      calendarId: values.calendarId,
      title: values.title.trim(),
      description: values.description.trim() || null,
      location: values.location.trim() || null,
      startAt: fromDateTimeLocal(values.startAt),
      endAt: fromDateTimeLocal(values.endAt),
      allDay: values.allDay,
      color: values.useEventColor ? values.color : null,
      recurrenceRule: effectiveRecurrenceRule,
      recurrenceScope: event ? values.recurrenceScope : undefined,
      attendees,
      reminders: normalizedReminders,
      visibility: values.visibility,
      status: values.status,
      documentIds,
    });
  };

  const submitInvalidForm = (
    formErrors: FieldErrors<CalendarEventEditorValues>,
  ) => {
    const message =
      formErrors.endAt?.message ||
      formErrors.title?.message ||
      formErrors.calendarId?.message;
    toast.error(
      intl.formatMessage({
        id: typeof message === "string" ? message : "calendar.requiredFields",
      }),
    );
  };

  const recurrenceOptions = [
    {
      value: CALENDAR_RECURRENCE_PRESET_VALUES.NONE,
      label: intl.formatMessage({ id: "calendar.recurrence.none" }),
    },
    {
      value: CALENDAR_RECURRENCE_PRESET_VALUES.DAILY,
      label: intl.formatMessage({ id: "calendar.recurrence.daily" }),
    },
    {
      value: CALENDAR_RECURRENCE_PRESET_VALUES.WEEKLY,
      label: intl.formatMessage(
        { id: "calendar.recurrence.weeklyOn" },
        { weekday: getWeekdayName(new Date(startAt), intl.locale) },
      ),
    },
    {
      value: CALENDAR_RECURRENCE_PRESET_VALUES.MONTHLY,
      label: intl.formatMessage(
        { id: "calendar.recurrence.monthlyOn" },
        { day: new Date(startAt).getDate() },
      ),
    },
    {
      value: CALENDAR_RECURRENCE_PRESET_VALUES.YEARLY,
      label: intl.formatMessage(
        { id: "calendar.recurrence.yearlyOn" },
        { date: getMonthDayName(new Date(startAt), intl.locale) },
      ),
    },
    {
      value: CALENDAR_RECURRENCE_PRESET_VALUES.WEEKDAYS,
      label: intl.formatMessage({ id: "calendar.recurrence.weekdays" }),
    },
    {
      value: CALENDAR_RECURRENCE_PRESET_VALUES.CUSTOM,
      label: intl.formatMessage({ id: "calendar.recurrence.custom" }),
    },
  ];

  if (!event && !showMoreOptions) {
    return (
      <>
        <QuickCreateModal
          form={form}
          calendars={calendars}
          kind={quickCreateKind}
          recurrencePreset={recurrencePreset}
          recurrenceOptions={recurrenceOptions}
          attendees={attendees}
          submitting={submitting}
          onKindChange={setQuickCreateKind}
          onAttendeesChange={setAttendees}
          onClose={onClose}
          onMoreOptions={() => setShowMoreOptions(true)}
          onSubmitEvent={handleSubmit(submitValidForm, submitInvalidForm)}
          onSubmitUiOnly={(kind) =>
            toast.info(
              intl.formatMessage({
                id:
                  kind === "task"
                    ? "calendar.quick.taskUiOnly"
                    : "calendar.quick.appointmentUiOnly",
              }),
            )
          }
          onUnavailableFeature={() =>
            toast.info(
              intl.formatMessage({ id: "calendar.quick.conferenceUiOnly" }),
            )
          }
          onStartDateChange={handleStartDateChange}
          onStartTimeChange={handleStartTimeChange}
          onEndTimeChange={handleEndTimeChange}
          onAllDayChange={handleAllDayChange}
          onRecurrenceChange={handleRecurrenceChange}
        />
        {showCustomRecurrence && (
          <CustomRecurrenceModal
            key={`${customRecurrence.frequency}-${customRecurrence.interval}`}
            open
            value={customRecurrence}
            onClose={() => setShowCustomRecurrence(false)}
            onSave={handleCustomRecurrenceSave}
          />
        )}
      </>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
      <form
        onSubmit={handleSubmit(submitValidForm, submitInvalidForm)}
        className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h2 className="text-lg font-black text-[var(--color-primary-dark)]">
            {intl.formatMessage({
              id: event ? "calendar.editEvent" : "calendar.createEvent",
            })}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="grid h-9 w-9 cursor-pointer place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-5">
          <input
            {...register("title")}
            placeholder={intl.formatMessage({ id: "calendar.titlePlaceholder" })}
            aria-invalid={Boolean(errors.title)}
            className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-base font-bold text-slate-800 outline-none focus:border-[var(--color-secondary)] focus:ring-4 focus:ring-blue-100"
          />

          <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
            <label className="space-y-2">
              <span className="text-xs font-black uppercase text-slate-400">
                {intl.formatMessage({ id: "nav.calendar" })}
              </span>
              <select
                {...register("calendarId")}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 outline-none focus:border-[var(--color-secondary)] focus:ring-4 focus:ring-blue-100"
              >
                {calendars.map((calendar) => (
                  <option key={calendar.id} value={calendar.id}>
                    {calendar.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="space-y-2">
              <span className="text-xs font-black uppercase text-slate-400">
                {intl.formatMessage({ id: "calendar.eventColor" })}
              </span>
              <div className="space-y-3 rounded-lg border border-slate-200 px-3 py-2">
                <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-bold text-slate-600">
                  <input
                    type="checkbox"
                    checked={useEventColor}
                    onChange={(changeEvent) => {
                      const checked = changeEvent.target.checked;
                      setValue("useEventColor", checked, { shouldDirty: true });
                      if (checked && color === null) {
                        setValue("color", CALENDAR_DEFAULT_EVENT_COLOR, {
                          shouldDirty: true,
                        });
                        setShowCustomEventColor(false);
                      }
                    }}
                    className="h-4 w-4 cursor-pointer rounded border-slate-300"
                  />
                  {intl.formatMessage({ id: "calendar.useEventColor" })}
                </label>
                {useEventColor && color !== null && (
                  <CalendarColorPicker
                    value={color}
                    showCustomColor={showCustomEventColor}
                    onChange={(nextColor) =>
                      setValue("color", nextColor, { shouldDirty: true })
                    }
                    onShowCustomColor={setShowCustomEventColor}
                  />
                )}
              </div>
            </div>
          </div>

          <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="date"
                value={getDateInputValue(startAt)}
                onChange={(changeEvent) =>
                  handleStartDateChange(changeEvent.target.value)
                }
                className="h-10 cursor-pointer rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 outline-none focus:border-[var(--color-secondary)] focus:ring-4 focus:ring-blue-100"
              />
              {!allDay && (
                <input
                  type="time"
                  value={getTimeInputValue(startAt)}
                  onChange={(changeEvent) =>
                    handleStartTimeChange(changeEvent.target.value)
                  }
                  className="h-10 cursor-pointer rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 outline-none focus:border-[var(--color-secondary)] focus:ring-4 focus:ring-blue-100"
                />
              )}
              <span className="px-1 text-sm font-black text-slate-400">
                {intl.formatMessage({ id: "calendar.to" })}
              </span>
              {!allDay && (
                <input
                  type="time"
                  value={getTimeInputValue(endAt)}
                  onChange={(changeEvent) =>
                    handleEndTimeChange(changeEvent.target.value)
                  }
                  className="h-10 cursor-pointer rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 outline-none focus:border-[var(--color-secondary)] focus:ring-4 focus:ring-blue-100"
                />
              )}
              <input
                type="date"
                value={getDateInputValue(endAt)}
                onChange={(changeEvent) =>
                  handleEndDateChange(changeEvent.target.value)
                }
                className="h-10 cursor-pointer rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 outline-none focus:border-[var(--color-secondary)] focus:ring-4 focus:ring-blue-100"
              />
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-bold text-slate-600">
                <input
                  type="checkbox"
                  checked={allDay}
                  onChange={(changeEvent) =>
                    handleAllDayChange(changeEvent.target.checked)
                  }
                  className="h-4 w-4 cursor-pointer rounded border-slate-300"
                />
                {intl.formatMessage({ id: "calendar.allDay" })}
              </label>
              <select
                value={recurrencePreset}
                onChange={(event) =>
                  handleRecurrenceChange(
                    event.target.value as CalendarRecurrencePreset,
                  )
                }
                className="h-10 cursor-pointer rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 outline-none focus:border-[var(--color-secondary)] focus:ring-4 focus:ring-blue-100"
              >
                {recurrenceOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className={`grid gap-4 ${showMoreOptions ? "md:grid-cols-3" : ""}`}>
            <label className="space-y-2">
              <span className="text-xs font-black uppercase text-slate-400">
                {intl.formatMessage({ id: "calendar.location" })}
              </span>
              <input
                {...register("location")}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 outline-none focus:border-[var(--color-secondary)] focus:ring-4 focus:ring-blue-100"
              />
            </label>
            {showMoreOptions && (
              <>
                <label className="space-y-2">
                  <span className="text-xs font-black uppercase text-slate-400">
                    {intl.formatMessage({ id: "calendar.visibility" })}
                  </span>
                  <select
                    {...register("visibility")}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 outline-none focus:border-[var(--color-secondary)] focus:ring-4 focus:ring-blue-100"
                  >
                    {Object.values(EventVisibility).map((value) => (
                      <option key={value} value={value}>
                        {intl.formatMessage({ id: `calendar.visibility.${value}` })}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="space-y-2">
                  <span className="text-xs font-black uppercase text-slate-400">
                    {intl.formatMessage({ id: "calendar.status" })}
                  </span>
                  <select
                    {...register("status")}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 outline-none focus:border-[var(--color-secondary)] focus:ring-4 focus:ring-blue-100"
                  >
                    {[EventStatus.CONFIRMED, EventStatus.TENTATIVE].map((value) => (
                      <option key={value} value={value}>
                        {intl.formatMessage({ id: `calendar.status.${value}` })}
                      </option>
                    ))}
                  </select>
                </label>
              </>
            )}
          </div>

          {event && (event.recurrenceRule || event.recurrenceParentId) && (
            <label className="block space-y-2 rounded-xl border border-blue-100 bg-blue-50 p-3">
              <span className="text-xs font-black uppercase text-blue-700">
                {intl.formatMessage({ id: "calendar.recurrenceScope" })}
              </span>
              <select
                {...register("recurrenceScope")}
                className="w-full rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700"
              >
                {Object.values(RecurrenceScope).map((value) => (
                  <option key={value} value={value}>
                    {intl.formatMessage({ id: `calendar.scope.${value}` })}
                  </option>
                ))}
              </select>
            </label>
          )}

          <AttendeePicker attendees={attendees} onChange={setAttendees} />

          <div className="space-y-3 rounded-xl border border-slate-200 p-3">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-2 text-xs font-black uppercase text-slate-400">
                <Bell className="h-4 w-4" />
                {intl.formatMessage({ id: "calendar.reminders" })}
              </span>
              <button
                type="button"
                disabled={reminderFields.length >= 5}
                onClick={() =>
                  appendReminder({
                    minutesBefore: 10,
                    method: ReminderMethod.ALERT,
                  })
                }
                className="inline-flex cursor-pointer items-center gap-1 text-xs font-black text-blue-600 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Plus className="h-3.5 w-3.5" />
                {intl.formatMessage({ id: "app.add" })}
              </button>
            </div>
            {reminderFields.map((reminder, index) => (
              <div key={reminder.id} className="grid grid-cols-[1fr_1fr_auto] gap-2">
                <select
                  {...register(`reminders.${index}.method`)}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700"
                >
                  {Object.values(ReminderMethod).map((method) => (
                    <option key={method} value={method}>{method}</option>
                  ))}
                </select>
                <div className="relative">
                <input
                  type="number"
                  min={0}
                  max={525600}
                  list="calendar-reminder-minutes"
                  {...register(`reminders.${index}.minutesBefore`, {
                    valueAsNumber: true,
                  })}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 pr-9 text-sm font-semibold text-slate-700"
                />
                <span className="pointer-events-none absolute right-2 top-2.5 text-[10px] font-bold text-slate-400">min</span>
                </div>
                <button
                  type="button"
                  onClick={() => removeReminder(index)}
                  className="grid h-10 w-10 cursor-pointer place-items-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600"
                  aria-label={intl.formatMessage({ id: "app.delete" })}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
            <datalist id="calendar-reminder-minutes">
              {CALENDAR_REMINDER_OPTIONS.filter((option) => option.value !== "custom").map((option) => (
                <option key={option.value} value={option.value} />
              ))}
            </datalist>
          </div>

          {!showMoreOptions && (
            <button
              type="button"
              onClick={() => setShowMoreOptions(true)}
              className="inline-flex cursor-pointer items-center gap-1 rounded-md px-2 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50"
            >
              <ChevronDown className="h-4 w-4" />
              {intl.formatMessage({ id: "calendar.moreOptions" })}
            </button>
          )}

          {showMoreOptions && (
            <>
              <div className="space-y-3 rounded-xl border border-slate-200 p-3">
                <label className="inline-flex items-center gap-2 text-xs font-black uppercase text-slate-400">
                  <FileText className="h-4 w-4" />
                  {intl.formatMessage({ id: "calendar.documents" })}
                </label>
                <input
                  value={documentSearch}
                  onChange={(changeEvent) => setDocumentSearch(changeEvent.target.value)}
                  placeholder={intl.formatMessage({ id: "calendar.searchDocuments" })}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700"
                />
                <div className="max-h-36 space-y-1 overflow-y-auto">
                  {(documentsQuery.data?.data || [])
                    .filter((document) => document.type === DocumentItemType.FILE)
                    .map((document) => (
                      <label key={document.id} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-slate-50">
                        <input
                          type="checkbox"
                          checked={documentIds.includes(document.id)}
                          onChange={(changeEvent) =>
                            setDocumentIds((current) =>
                              changeEvent.target.checked
                                ? [...new Set([...current, document.id])]
                                : current.filter((id) => id !== document.id),
                            )
                          }
                        />
                        <span className="truncate text-sm font-semibold text-slate-600">{document.name}</span>
                      </label>
                    ))}
                </div>
              </div>

              <textarea
                {...register("description")}
                placeholder={intl.formatMessage({ id: "calendar.descriptionPlaceholder" })}
                rows={3}
                className="w-full resize-none rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 outline-none focus:border-[var(--color-secondary)] focus:ring-4 focus:ring-blue-100"
              />
            </>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-200 px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-lg border border-slate-200 px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50"
          >
            {intl.formatMessage({ id: "app.cancel" })}
          </button>
          <button
            type="submit"
            disabled={submitting || isSubmitting}
            className="cursor-pointer rounded-lg bg-[var(--color-primary-dark)] px-4 py-2 text-sm font-bold text-white hover:bg-[var(--color-primary)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting
              ? intl.formatMessage({ id: "app.saving" })
              : intl.formatMessage({ id: "app.save" })}
          </button>
        </div>
      </form>
      {showCustomRecurrence && (
        <CustomRecurrenceModal
          key={`${customRecurrence.frequency}-${customRecurrence.interval}`}
          open
          value={customRecurrence}
          onClose={() => setShowCustomRecurrence(false)}
          onSave={handleCustomRecurrenceSave}
        />
      )}
    </div>
  );
}
