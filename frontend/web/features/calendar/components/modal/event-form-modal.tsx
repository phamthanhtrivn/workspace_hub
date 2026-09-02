"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import type { FieldErrors } from "react-hook-form";
import { toast } from "sonner";
import { useAppIntl } from "@/features/i18n/useAppIntl";
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
} from "../../types/calendar.constants";
import {
  composeDateTimeLocal,
  ensureMinimumEventEndAt,
  fromDateTimeLocal,
  getDateInputValue,
  getTimeInputValue,
  hasMinimumEventDuration,
  isAllDayDateTimeRange,
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
import {
  CalendarEventEditorValues,
  calendarEventFormSchema,
} from "../../schemas/calendar-event-form.schema";
import {
  QuickCreateKind,
  QuickCreateModal,
} from "./quick-create-modal";
import {
  AttachmentEditor,
  EventTimeEditor,
  ReminderEditor,
} from "./event-form-sections";

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
  const defaultAllDay =
    event?.allDay ||
    (event && isAllDayDateTimeRange(defaultStart, defaultEnd)) ||
    initialDraft?.allDay ||
    false;

  const form = useForm<CalendarEventEditorValues>({
    resolver: zodResolver(calendarEventFormSchema),
    defaultValues: {
      calendarId: initialCalendarId,
      title: event?.title || "",
      description: event?.description || "",
      location: event?.location || "",
      startAt: toDateTimeLocal(defaultStart),
      endAt: toDateTimeLocal(defaultEnd),
      allDay: defaultAllDay,
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
  const allDayRegistration = register("allDay");
  const useEventColor = useWatch({ control, name: "useEventColor" });
  const color = useWatch({ control, name: "color" });
  const [showCustomEventColor, setShowCustomEventColor] = useState(
    Boolean(
      event?.color &&
        !(CALENDAR_COLOR_CHOICES as readonly string[]).includes(event.color),
    ),
  );
  const [attendees, setAttendees] = useState<CalendarEventAttendeePayload[]>(
    () =>
      (event?.attendees || [])
        .filter((attendee) => attendee.userId !== event?.createdBy)
        .map(({ userId, optional }) => ({
          userId,
          optional: optional ?? false,
        })),
  );
  const [documentIds] = useState<string[]>(event?.documentIds ?? []);
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

  const handleEndDateTimeChange = (nextEndAt: string) => {
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
          onEndDateTimeChange={handleEndDateTimeChange}
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
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/45 p-3 backdrop-blur-[1px] sm:p-5">
      <form
        onSubmit={handleSubmit(submitValidForm, submitInvalidForm)}
        className="flex max-h-[94dvh] w-full max-w-[36rem] flex-col overflow-hidden rounded-2xl bg-[#f3f6fb] shadow-[0_18px_48px_rgba(15,40,84,0.26)]"
      >
        <div className="flex h-12 shrink-0 items-center justify-between bg-[#e2e8f0] px-5">
          <h2 className="text-base font-semibold text-slate-800">
            {intl.formatMessage({
              id: event ? "calendar.editEvent" : "calendar.createEvent",
            })}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="grid h-9 w-9 cursor-pointer place-items-center rounded-full text-slate-500 transition hover:bg-slate-300/70 hover:text-slate-800"
            aria-label={intl.formatMessage({ id: "app.close" })}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-5 sm:px-7">
          <input
            {...register("title")}
            placeholder={intl.formatMessage({ id: "calendar.titlePlaceholder" })}
            aria-invalid={Boolean(errors.title)}
            className="w-full border-0 border-b-[3px] border-blue-600 bg-transparent px-0 pb-1 text-2xl font-normal text-slate-800 outline-none placeholder:text-slate-500 focus:ring-0"
          />

          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)]">
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

          <EventTimeEditor
            startAt={startAt}
            endAt={endAt}
            allDay={allDay}
            allDayRegistration={allDayRegistration}
            recurrencePreset={recurrencePreset}
            recurrenceOptions={recurrenceOptions}
            showRecurrenceScope={Boolean(
              event && (event.recurrenceRule || event.recurrenceParentId),
            )}
            register={register}
            onStartDateChange={handleStartDateChange}
            onStartTimeChange={handleStartTimeChange}
            onEndDateChange={handleEndDateChange}
            onEndDateTimeChange={handleEndDateTimeChange}
            onAllDayChange={handleAllDayChange}
            onRecurrenceChange={handleRecurrenceChange}
          />

          <ReminderEditor control={control} register={register} />
          <AttachmentEditor documentCount={documentIds.length} />

          <textarea
            {...register("description")}
            placeholder={intl.formatMessage({ id: "calendar.descriptionPlaceholder" })}
            rows={3}
            className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-semibold text-slate-700 outline-none placeholder:text-slate-400 focus:border-[var(--color-secondary)] focus:ring-4 focus:ring-blue-100"
          />
        </div>

        <div className="flex shrink-0 justify-end gap-2 border-t border-slate-200 px-5 py-4 sm:px-7">
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-full px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-200/70"
          >
            {intl.formatMessage({ id: "app.cancel" })}
          </button>
          <button
            type="submit"
            disabled={submitting || isSubmitting}
            className="cursor-pointer rounded-full bg-blue-700 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-800 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-60"
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
