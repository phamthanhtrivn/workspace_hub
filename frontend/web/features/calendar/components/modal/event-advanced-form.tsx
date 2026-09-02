"use client";

import { X } from "lucide-react";
import { useRef } from "react";
import { useWatch } from "react-hook-form";
import { useAppIntl } from "@/features/i18n/useAppIntl";
import { CalendarEventFormController } from "../../hooks/use-calendar-event-form";
import { useModalDialog } from "../../hooks/use-modal-dialog";
import { CalendarEvent, WorkspaceCalendar } from "../../types/calendar.types";
import { CalendarColorPicker } from "../sidebar/calendar-style-fields";
import { AttachmentEditor } from "./attachment-editor";
import { EventTimeEditor } from "./event-time-editor";
import { ReminderEditor } from "./reminder-editor";

interface EventAdvancedFormProps {
  calendars: WorkspaceCalendar[];
  controller: CalendarEventFormController;
  event?: CalendarEvent | null;
  onClose: () => void;
  submitting?: boolean;
}

export function EventAdvancedForm({
  calendars,
  controller,
  event,
  onClose,
  submitting,
}: EventAdvancedFormProps) {
  const intl = useAppIntl();
  const dialogRef = useRef<HTMLFormElement>(null);
  const { control, formState, register, setValue } = controller.form;
  const useEventColor = useWatch({ control, name: "useEventColor" });
  const color = useWatch({ control, name: "color" });
  useModalDialog({ dialogRef, onClose });

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/45 p-3 backdrop-blur-[1px] sm:p-5">
      <form
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="calendar-event-form-heading"
        onSubmit={controller.submit}
        className="flex max-h-[94dvh] w-full max-w-[36rem] flex-col overflow-hidden rounded-2xl bg-[#f3f6fb] shadow-[0_18px_48px_rgba(15,40,84,0.26)]"
      >
        <div className="flex h-12 shrink-0 items-center justify-between bg-[#e2e8f0] px-5">
          <h2
            id="calendar-event-form-heading"
            className="text-base font-semibold text-slate-800"
          >
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
            data-modal-initial-focus
            aria-label={intl.formatMessage({ id: "calendar.titlePlaceholder" })}
            placeholder={intl.formatMessage({ id: "calendar.titlePlaceholder" })}
            aria-invalid={Boolean(formState.errors.title)}
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
                    onChange={(changeEvent) =>
                      controller.enableEventColor(changeEvent.target.checked)
                    }
                    className="h-4 w-4 cursor-pointer rounded border-slate-300"
                  />
                  {intl.formatMessage({ id: "calendar.useEventColor" })}
                </label>
                {useEventColor && color !== null && (
                  <CalendarColorPicker
                    value={color}
                    showCustomColor={controller.showCustomEventColor}
                    onChange={(nextColor) =>
                      setValue("color", nextColor, { shouldDirty: true })
                    }
                    onShowCustomColor={controller.setShowCustomEventColor}
                  />
                )}
              </div>
            </div>
          </div>

          <EventTimeEditor
            startAt={controller.startAt}
            endAt={controller.endAt}
            allDay={controller.allDay}
            allDayRegistration={register("allDay")}
            recurrencePreset={controller.recurrencePreset}
            recurrenceOptions={controller.recurrenceOptions}
            showRecurrenceScope={Boolean(
              event && (event.recurrenceRule || event.recurrenceParentId),
            )}
            register={register}
            onStartDateChange={controller.handleStartDateChange}
            onStartTimeChange={controller.handleStartTimeChange}
            onEndDateChange={controller.handleEndDateChange}
            onEndDateTimeChange={controller.handleEndDateTimeChange}
            onAllDayChange={controller.handleAllDayChange}
            onRecurrenceChange={controller.handleRecurrenceChange}
          />

          <ReminderEditor control={control} register={register} />
          <AttachmentEditor documentCount={controller.documentIds.length} />

          <textarea
            {...register("description")}
            aria-label={intl.formatMessage({ id: "calendar.descriptionPlaceholder" })}
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
