"use client";

import {
  AlignLeft,
  Bell,
  CalendarDays,
  ChevronDown,
  Paperclip,
  Target,
  X,
} from "lucide-react";
import { FormEventHandler, useRef, useState } from "react";
import { useWatch } from "react-hook-form";
import { toast } from "sonner";
import { useAppIntl } from "@/features/i18n/useAppIntl";
import { CalendarEventFormController } from "../../hooks/use-calendar-event-form";
import { useModalDialog } from "../../hooks/use-modal-dialog";
import {
  CalendarEvent,
  EventSourceType,
  WorkspaceCalendar,
} from "../../types/calendar.types";
import { AttachmentEditor } from "./attachment-editor";
import { QuickCreateEventFields } from "./quick-create-event-fields";
import {
  QuickCreateKind,
  QuickCreateTimeSection,
  QuickRow,
} from "./quick-create-time-section";
import { ReminderEditor } from "./reminder-editor";

export type { QuickCreateKind } from "./quick-create-time-section";

export interface QuickCreateModalProps {
  controller: CalendarEventFormController;
  calendars: WorkspaceCalendar[];
  event?: CalendarEvent | null;
  kind: QuickCreateKind;
  tasksColor?: string;
  submitting?: boolean;
  onKindChange: (kind: QuickCreateKind) => void;
  onClose: () => void;
}

const QUICK_CREATE_TABS: Array<{ value: QuickCreateKind; labelId: string }> = [
  { value: "event", labelId: "calendar.quick.event" },
  { value: "task", labelId: "calendar.quick.task" },
];

export function QuickCreateModal({
  controller,
  calendars,
  event,
  kind,
  tasksColor,
  submitting,
  onKindChange,
  onClose,
}: QuickCreateModalProps) {
  const intl = useAppIntl();
  const dialogRef = useRef<HTMLFormElement>(null);
  const isEditing = Boolean(event?.id);

  const { control, formState, getValues, register, setValue } = controller.form;
  const calendarId = useWatch({ control, name: "calendarId" });
  const reminders = useWatch({ control, name: "reminders" });

  const selectedCalendar =
    calendars.find((calendar) => calendar.id === calendarId) ?? calendars[0];
  useModalDialog({ dialogRef, onClose });

  // Expand "More options" downwards
  const [showMoreOptions, setShowMoreOptions] = useState<boolean>(() => {
    if (!event) return false;
    const hasMultipleReminders = Boolean(event.reminders && event.reminders.length > 1);
    const hasDocs = Boolean(event.documentIds && event.documentIds.length > 0);
    return hasMultipleReminders || hasDocs;
  });

  // Task deadline state
  const [showDeadline, setShowDeadline] = useState<boolean>(() => {
    const desc = event?.description || "";
    return /\[(?:Hạn chót|Deadline):/i.test(desc);
  });
  const [deadlineDate, setDeadlineDate] = useState<string>(() => {
    const desc = event?.description || "";
    const match = desc.match(/\[(?:Hạn chót|Deadline):\s*(\d{4}-\d{2}-\d{2})/i);
    return match ? match[1] : "";
  });
  const [deadlineTime, setDeadlineTime] = useState<string>(() => {
    const desc = event?.description || "";
    const match = desc.match(/\[(?:Hạn chót|Deadline):\s*\d{4}-\d{2}-\d{2}\s+(\d{2}:\d{2})/i);
    return match ? match[1] : "";
  });

  const handleSubmit: FormEventHandler<HTMLFormElement> = (submitEvent) => {
    if (kind === "task") {
      setValue("sourceType", EventSourceType.TASK);
      setValue("useEventColor", true);
      setValue("color", tasksColor || "#f59e0b");
      const personalCalendar =
        calendars.find((c) => !c.projectId && c.isDefault) ??
        calendars.find((c) => !c.projectId) ??
        calendars[0];
      if (personalCalendar) {
        setValue("calendarId", personalCalendar.id);
      }
      let curDesc = getValues("description") || "";
      if (!curDesc.includes("[TASK]")) {
        curDesc = curDesc ? `[TASK] ${curDesc}` : "[TASK]";
      }
      if (showDeadline && deadlineDate) {
        const deadlineStr = `[${intl.formatMessage({ id: "calendar.quick.deadline" })}: ${deadlineDate}${deadlineTime ? ` ${deadlineTime}` : ""}]`;
        if (!curDesc.includes(deadlineStr)) {
          curDesc = curDesc ? `${curDesc}\n${deadlineStr}` : deadlineStr;
        }
      }
      setValue("description", curDesc);
    } else {
      setValue("sourceType", EventSourceType.USER);
    }
    controller.submit(submitEvent);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/40 p-3 backdrop-blur-[2px] sm:p-5">
      <form
        ref={dialogRef}
        onSubmit={handleSubmit}
        role="dialog"
        aria-modal="true"
        aria-labelledby="calendar-quick-create-heading"
        className="flex max-h-[92dvh] w-full max-w-[36rem] flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-[#f3f6fb] shadow-[0_18px_48px_rgba(15,40,84,0.26)] transition-all duration-300 ease-out"
      >
        {/* Modal Top Bar */}
        <div className="flex h-11 shrink-0 items-center justify-between border-b border-slate-200/60 bg-[#e2e8f0] px-4 sm:px-6">
          {isEditing ? (
            <h2
              id="calendar-quick-create-heading"
              className="text-sm font-semibold text-slate-800"
            >
              {intl.formatMessage({
                id: kind === "task" ? "calendar.quick.task" : "calendar.editEvent",
              })}
            </h2>
          ) : (
            <div className="flex items-center gap-2">
              <span className="h-1 w-6 rounded-full bg-slate-400/80" />
              <h2 id="calendar-quick-create-heading" className="sr-only">
                {intl.formatMessage({ id: "calendar.createEvent" })}
              </h2>
            </div>
          )}
          <button
            type="button"
            onClick={onClose}
            className="grid h-8 w-8 cursor-pointer place-items-center rounded-full text-slate-600 transition hover:bg-slate-300/70 hover:text-slate-900"
            aria-label={intl.formatMessage({ id: "app.close" })}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Title and Tabs */}
        <div className="shrink-0 px-5 pt-4 sm:px-7 sm:pt-5">
          <input
            {...register("title")}
            data-modal-initial-focus
            id="calendar-quick-create-title"
            aria-label={intl.formatMessage({ id: "calendar.quick.addTitle" })}
            placeholder={intl.formatMessage({ id: "calendar.quick.addTitle" })}
            aria-invalid={Boolean(formState.errors.title)}
            className="ml-10 w-[calc(100%-2.5rem)] border-0 border-b border-slate-300 bg-transparent px-0 pb-1 text-2xl font-normal text-slate-800 outline-none placeholder:text-slate-500 focus:border-blue-600 focus:ring-0"
          />
          {formState.errors.title && (
            <p className="ml-10 mt-1 text-xs font-medium text-red-600">
              {intl.formatMessage({ id: "calendar.requiredFields" })}
            </p>
          )}

          {!isEditing && (
            <div className="ml-10 mt-3 flex flex-wrap gap-1.5" role="tablist">
              {QUICK_CREATE_TABS.map((tab) => (
                <button
                  key={tab.value}
                  type="button"
                  role="tab"
                  aria-selected={kind === tab.value}
                  onClick={() => onKindChange(tab.value)}
                  className={`cursor-pointer rounded-lg px-3.5 py-1.5 text-sm font-medium transition ${
                    kind === tab.value
                      ? "bg-[#c2e7ff] text-[#001d35] font-semibold"
                      : "text-slate-700 hover:bg-slate-200/70"
                  }`}
                >
                  {intl.formatMessage({ id: tab.labelId })}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Scrollable Body */}
        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-4 pt-1 sm:px-7">
          <div className="mt-3 space-y-3">
            {/* Time & Recurrence Section */}
            <QuickCreateTimeSection
              form={controller.form}
              kind={kind}
              recurrencePreset={controller.recurrencePreset}
              recurrenceOptions={controller.recurrenceOptions}
              onStartDateChange={controller.handleStartDateChange}
              onStartTimeChange={controller.handleStartTimeChange}
              onEndDateTimeChange={controller.handleEndDateTimeChange}
              onAllDayChange={controller.handleAllDayChange}
              onRecurrenceChange={controller.handleRecurrenceChange}
            />

            {/* Event Specific: Attendees, Video Conference, Location */}
            {kind === "event" && (
              <QuickCreateEventFields
                attendees={controller.attendees}
                onAttendeesChange={controller.setAttendees}
                register={register}
              />
            )}

            {/* Task Specific: Deadline */}
            {kind === "task" && (
              <QuickRow icon={<Target className="h-5 w-5" />}>
                {!showDeadline ? (
                  <button
                    type="button"
                    onClick={() => setShowDeadline(true)}
                    className="cursor-pointer rounded-lg px-2 py-1.5 text-sm font-normal text-slate-700 transition hover:bg-slate-200/60"
                  >
                    {intl.formatMessage({ id: "calendar.quick.addDeadline" })}
                  </button>
                ) : (
                  <div className="flex flex-wrap items-center gap-2 rounded-lg bg-slate-200/60 px-2.5 py-1">
                    <input
                      type="date"
                      value={deadlineDate}
                      aria-label={intl.formatMessage({
                        id: "calendar.quick.deadline",
                      })}
                      onChange={(e) => setDeadlineDate(e.target.value)}
                      className="h-8 cursor-pointer border-0 bg-transparent text-sm font-medium text-slate-700 outline-none"
                    />
                    <input
                      type="time"
                      value={deadlineTime}
                      aria-label={intl.formatMessage({
                        id: "calendar.quick.deadline",
                      })}
                      onChange={(e) => setDeadlineTime(e.target.value)}
                      className="h-8 cursor-pointer border-0 bg-transparent text-sm font-medium text-slate-700 outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setShowDeadline(false);
                        setDeadlineDate("");
                        setDeadlineTime("");
                      }}
                      className="ml-auto cursor-pointer rounded-full p-1 text-slate-500 hover:bg-slate-300 hover:text-slate-800"
                      aria-label={intl.formatMessage({ id: "app.close" })}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </QuickRow>
            )}

            {/* Description */}
            <QuickRow icon={<AlignLeft className="h-5 w-5" />}>
              <textarea
                {...register("description")}
                aria-label={intl.formatMessage({
                  id: "calendar.quick.addDescription",
                })}
                rows={kind === "event" ? 2 : 3}
                placeholder={intl.formatMessage({
                  id: "calendar.quick.addDescriptionAttachment",
                })}
                className="w-full resize-none rounded-xl border border-transparent bg-transparent px-3 py-2 text-sm text-slate-700 outline-none transition placeholder:text-slate-500 hover:bg-slate-200/60 focus:border-blue-500/50 focus:bg-white focus:ring-1 focus:ring-blue-100"
              />
            </QuickRow>

            {/* Calendar Selector */}
            <QuickRow icon={<CalendarDays className="h-5 w-5" />}>
              <div className="rounded-xl px-2.5 py-2 hover:bg-slate-200/50">
                <div className="flex items-center gap-2">
                  <select
                    {...register("calendarId")}
                    aria-label={intl.formatMessage({ id: "nav.calendar" })}
                    className="min-w-0 max-w-full cursor-pointer border-0 bg-transparent text-sm font-medium text-slate-700 outline-none"
                  >
                    {calendars.map((cal) => (
                      <option key={cal.id} value={cal.id}>
                        {cal.name}
                      </option>
                    ))}
                  </select>
                  <span
                    className="h-3.5 w-3.5 shrink-0 rounded-full"
                    style={{
                      backgroundColor:
                        kind === "task"
                          ? tasksColor || "#f59e0b"
                          : selectedCalendar?.color || "#2563eb",
                    }}
                  />
                </div>
                <p className="mt-0.5 truncate text-xs text-slate-500">
                  {kind === "task"
                    ? intl.locale === "vi"
                      ? "Lịch cá nhân · Việc cần làm"
                      : "Personal calendar · Tasks"
                    : intl.formatMessage(
                        { id: "calendar.quick.eventSummary" },
                        { reminder: reminders?.[0]?.minutesBefore ?? 10 },
                      )}
                </p>
              </div>
            </QuickRow>

            {/* EXPANDABLE SECTION (Tùy chọn khác) */}
            {showMoreOptions && (
              <div className="space-y-3 pt-3 border-t border-slate-200/70 transition-all duration-300">
                {/* Reminders Row */}
                <QuickRow icon={<Bell className="h-5 w-5" />}>
                  <ReminderEditor control={control} register={register} />
                </QuickRow>

                {/* Attachments Row */}
                <QuickRow icon={<Paperclip className="h-5 w-5" />}>
                  <AttachmentEditor
                    documentCount={controller.documentIds.length}
                  />
                </QuickRow>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer with "Tùy chọn khác" expansion toggle */}
        <div className="flex shrink-0 items-center justify-between border-t border-slate-200/60 bg-[#f3f6fb] px-5 py-3 sm:px-7">
          <button
            type="button"
            onClick={() => setShowMoreOptions((prev) => !prev)}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold text-blue-700 transition hover:bg-blue-100 active:scale-[0.98]"
          >
            <span>
              {showMoreOptions
                ? intl.locale === "vi"
                  ? "Thu gọn tùy chọn"
                  : "Fewer options"
                : intl.formatMessage({ id: "calendar.moreOptions" })}
            </span>
            <ChevronDown
              className={`h-4 w-4 transition-transform duration-200 ${
                showMoreOptions ? "rotate-180" : ""
              }`}
            />
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="cursor-pointer rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 active:scale-[0.98]"
            >
              {intl.formatMessage({ id: "app.cancel" })}
            </button>
            <button
              type="submit"
              disabled={submitting || formState.isSubmitting}
              className="cursor-pointer rounded-full bg-blue-700 px-6 py-2 text-sm font-semibold text-white shadow-xs transition hover:bg-blue-800 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting
                ? intl.formatMessage({ id: "app.saving" })
                : intl.formatMessage({ id: "app.save" })}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
