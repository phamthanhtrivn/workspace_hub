"use client";

import { AlignLeft, CalendarDays, ChevronDown, X } from "lucide-react";
import { FormEventHandler, useRef } from "react";
import { UseFormReturn, useWatch } from "react-hook-form";
import { useAppIntl } from "@/features/i18n/useAppIntl";
import { useModalDialog } from "../../hooks/use-modal-dialog";
import { CalendarEventEditorValues } from "../../schemas/calendar-event-form.schema";
import {
  CalendarEventAttendeePayload,
  WorkspaceCalendar,
} from "../../types/calendar.types";
import { CalendarRecurrencePreset } from "../../utils/calendar-recurrence.utils";
import { QuickCreateAppointmentFields } from "./quick-create-appointment-fields";
import { QuickCreateEventFields } from "./quick-create-event-fields";
import { QuickCreateTaskFields } from "./quick-create-task-fields";
import {
  QuickCreateKind,
  QuickCreateTimeSection,
  QuickRow,
} from "./quick-create-time-section";

export type { QuickCreateKind } from "./quick-create-time-section";

interface QuickCreateTimeEditor {
  recurrencePreset: CalendarRecurrencePreset;
  recurrenceOptions: Array<{ value: string; label: string }>;
  onStartDateChange: (date: string) => void;
  onStartTimeChange: (time: string) => void;
  onEndDateTimeChange: (dateTime: string) => void;
  onAllDayChange: (checked: boolean) => void;
  onRecurrenceChange: (preset: CalendarRecurrencePreset) => void;
}

interface QuickCreateModalProps {
  form: UseFormReturn<CalendarEventEditorValues>;
  calendars: WorkspaceCalendar[];
  kind: QuickCreateKind;
  timeEditor: QuickCreateTimeEditor;
  attendees: CalendarEventAttendeePayload[];
  submitting?: boolean;
  onKindChange: (kind: QuickCreateKind) => void;
  onAttendeesChange: (attendees: CalendarEventAttendeePayload[]) => void;
  onClose: () => void;
  onMoreOptions: () => void;
  onSubmitEvent: FormEventHandler<HTMLFormElement>;
  onSubmitUiOnly: (kind: Exclude<QuickCreateKind, "event">) => void;
  onUnavailableFeature: (feature: "conference") => void;
}

const QUICK_CREATE_TABS: Array<{ value: QuickCreateKind; labelId: string }> = [
  { value: "event", labelId: "calendar.quick.event" },
  { value: "task", labelId: "calendar.quick.task" },
  { value: "appointment", labelId: "calendar.quick.appointment" },
];

export function QuickCreateModal({
  form,
  calendars,
  kind,
  timeEditor,
  attendees,
  submitting,
  onKindChange,
  onAttendeesChange,
  onClose,
  onMoreOptions,
  onSubmitEvent,
  onSubmitUiOnly,
  onUnavailableFeature,
}: QuickCreateModalProps) {
  const intl = useAppIntl();
  const dialogRef = useRef<HTMLFormElement>(null);
  const { control, formState, getValues, register } = form;
  const startAt = useWatch({ control, name: "startAt" });
  const calendarId = useWatch({ control, name: "calendarId" });
  const reminders = useWatch({ control, name: "reminders" });
  const selectedCalendar =
    calendars.find((calendar) => calendar.id === calendarId) ?? calendars[0];
  useModalDialog({ dialogRef, onClose });

  const submitUiOnly: FormEventHandler<HTMLFormElement> = (submitEvent) => {
    submitEvent.preventDefault();
    if (!getValues("title").trim()) {
      form.setError("title", { message: "calendar.requiredFields" });
      return;
    }
    onSubmitUiOnly(kind as Exclude<QuickCreateKind, "event">);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/35 p-3 backdrop-blur-[1px] sm:p-5">
      <form
        ref={dialogRef}
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
            data-modal-initial-focus
            id="calendar-quick-create-title"
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
            {QUICK_CREATE_TABS.map((tab) => (
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
            <QuickCreateTimeSection form={form} kind={kind} {...timeEditor} />

            {kind === "event" && (
              <QuickCreateEventFields
                attendees={attendees}
                onAttendeesChange={onAttendeesChange}
                onUnavailableConference={() =>
                  onUnavailableFeature("conference")
                }
                register={register}
              />
            )}
            {kind === "task" && <QuickCreateTaskFields startAt={startAt} />}
            {kind === "appointment" && (
              <QuickCreateAppointmentFields register={register} />
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
                    style={{
                      backgroundColor: selectedCalendar?.color || "#2563eb",
                    }}
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
