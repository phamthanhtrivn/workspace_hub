"use client";

import {
  AlignLeft,
  Bell,
  CalendarDays,
  ChevronDown,
  ListTodo,
  Paperclip,
  Target,
  X,
} from "lucide-react";
import { FormEventHandler, useRef, useState } from "react";
import { useWatch } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { CustomSelect } from "@/components/ui/custom/custom-select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { CALENDAR_FORM_COPY as copy } from "../../constants/calendar-form-copy";
import { CalendarEventFormController } from "../../hooks/use-calendar-event-form";
import { useModalDialog } from "../../hooks/use-modal-dialog";
import {
  CalendarEvent,
  EventSourceType,
  WorkspaceCalendar,
} from "../../types/calendar.types";
import {
  readTaskDeadline,
  writeTaskDeadline,
} from "../../utils/calendar-task-deadline.utils";
import { CalendarDocumentsSection } from "./calendar-documents-section";
import { QuickCreateEventFields } from "./quick-create-event-fields";
import {
  QuickCreateKind,
  QuickCreateTimeSection,
  QuickRow,
} from "./quick-create-time-section";
import { ReminderEditor } from "./reminder-editor";
import { formatReminderSummary } from "../../utils/calendar-reminder.utils";

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

const QUICK_CREATE_TABS: Array<{ value: QuickCreateKind; label: string }> = [
  { value: "event", label: copy.event },
  { value: "task", label: copy.task },
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
  const dialogRef = useRef<HTMLFormElement>(null);
  const isEditing = Boolean(event?.id);

  const { control, formState, getValues, register, setValue } = controller.form;
  const calendarId = useWatch({ control, name: "calendarId" });
  const reminders = useWatch({ control, name: "reminders" });
  const modalAccent = kind === "task" ? tasksColor || "#f59e0b" : "#2563eb";
  const modalTitle = isEditing
    ? kind === "task"
      ? copy.editTask
      : copy.editEvent
    : kind === "task"
      ? copy.addTask
      : copy.createEvent;

  const selectedCalendar =
    calendars.find((calendar) => calendar.id === calendarId) ?? calendars[0];
  const locationValue = useWatch({ control, name: "location" }) ?? "";
  useModalDialog({ dialogRef, onClose, lockDocumentScroll: false });

  // Expand "More options" downwards
  const [showMoreOptions, setShowMoreOptions] = useState<boolean>(() => {
    if (!event) return false;
    const hasMultipleReminders = Boolean(
      event.reminders && event.reminders.length > 1,
    );
    const hasDocs = Boolean(event.documentIds && event.documentIds.length > 0);
    return hasMultipleReminders || hasDocs;
  });

  // Task deadline state
  const initialDeadline = readTaskDeadline(event?.description);
  const [showDeadline, setShowDeadline] = useState(
    Boolean(initialDeadline.date),
  );
  const [deadlineDate, setDeadlineDate] = useState(initialDeadline.date);
  const [deadlineTime, setDeadlineTime] = useState(initialDeadline.time);

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
      setValue(
        "description",
        writeTaskDeadline(
          getValues("description") || "",
          deadlineDate,
          deadlineTime,
          showDeadline,
        ),
      );
    } else {
      setValue("sourceType", EventSourceType.USER);
    }
    controller.submit(submitEvent);
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/30 p-2 backdrop-blur-[3px] sm:p-5"
      onWheelCapture={(event) => {
        if (
          event.target instanceof Node &&
          dialogRef.current?.contains(event.target)
        ) {
          return;
        }
        event.preventDefault();
        event.stopPropagation();
      }}
      onTouchMoveCapture={(event) => {
        if (
          event.target instanceof Node &&
          dialogRef.current?.contains(event.target)
        ) {
          return;
        }
        event.preventDefault();
        event.stopPropagation();
      }}
    >
      <form
        ref={dialogRef}
        onSubmit={handleSubmit}
        role="dialog"
        aria-modal="true"
        aria-labelledby="calendar-quick-create-heading"
        className="flex max-h-[92dvh] w-full max-w-[35rem] flex-col overflow-hidden rounded-[1.75rem] border border-slate-200/80 bg-white shadow-[0_24px_70px_rgba(15,23,42,0.24)] ring-1 ring-white/70 transition-all duration-300 ease-out"
      >
        {/* Modal Top Bar */}
        <div className="flex h-12 shrink-0 items-center justify-between border-b border-slate-200/70 bg-slate-100/80 px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <span className="h-1 w-7 rounded-full bg-slate-400/80" />
            <h2
              id="calendar-quick-create-heading"
              className="truncate text-xs font-bold uppercase text-slate-500"
            >
              {modalTitle}
            </h2>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="grid h-8 w-8 cursor-pointer place-items-center rounded-full text-slate-500 transition hover:bg-white hover:text-slate-900"
            aria-label={copy.close}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Title and Tabs */}
        <div className="shrink-0 px-5 pt-5 sm:px-7">
          <Input
            {...register("title")}
            data-modal-initial-focus
            id="calendar-quick-create-title"
            aria-label={copy.addTitle}
            placeholder={copy.addTitle}
            aria-invalid={Boolean(formState.errors.title)}
            className="ml-12 h-auto w-[calc(100%-3rem)] rounded-none border-0 border-b border-slate-200 bg-transparent px-0 pb-2 text-2xl font-medium leading-tight text-slate-800 shadow-none outline-none placeholder:text-slate-500 focus:border-blue-500 focus-visible:ring-0 sm:text-[1.7rem]"
          />
          {formState.errors.title && (
            <p className="ml-12 mt-2 text-xs font-semibold text-red-600">
              {copy.requiredFields}
            </p>
          )}

          {!isEditing && (
            <div
              className="ml-12 mt-4 inline-flex rounded-2xl bg-slate-100 p-1 shadow-inner shadow-slate-200/70"
              role="tablist"
            >
              {QUICK_CREATE_TABS.map((tab) => (
                <Button
                  key={tab.value}
                  type="button"
                  variant="ghost"
                  role="tab"
                  aria-selected={kind === tab.value}
                  onClick={() => onKindChange(tab.value)}
                  className={cn(
                    "h-8 cursor-pointer rounded-xl px-4 text-sm font-semibold transition hover:bg-white/80",
                    kind === tab.value
                      ? "bg-white text-slate-900 shadow-sm ring-1 ring-slate-200/60"
                      : "text-slate-500 hover:text-slate-800",
                  )}
                  style={
                    kind === tab.value
                      ? {
                          color: tab.value === "task" ? modalAccent : undefined,
                        }
                      : undefined
                  }
                >
                  {tab.label}
                </Button>
              ))}
            </div>
          )}
        </div>

        {/* Scrollable Body */}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-4 pt-4 sm:px-7">
          <div className="space-y-2.5">
            {/* Time & Recurrence Section */}
            <QuickCreateTimeSection
              form={controller.form}
              kind={kind}
              recurrencePreset={controller.recurrencePreset}
              recurrenceOptions={controller.recurrenceOptions}
              onStartDateChange={controller.handleStartDateChange}
              onEndDateChange={controller.handleEndDateChange}
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
                locationValue={locationValue}
                onLocationChange={(val) =>
                  setValue("location", val, { shouldDirty: true })
                }
                hasConference={controller.hasConference}
                onToggleConference={controller.setHasConference}
                isPastEvent={controller.isPastEvent}
                register={register}
              />
            )}

            {/* Task Specific: Deadline */}
            {kind === "task" && (
              <QuickRow icon={<Target className="h-5 w-5" />}>
                {!showDeadline ? (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setShowDeadline(true)}
                    className="h-auto w-full cursor-pointer justify-start rounded-xl px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100"
                  >
                    {copy.addDeadline}
                  </Button>
                ) : (
                  <div
                    className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200/70 bg-slate-50/90 px-3 py-2"
                    style={{
                      boxShadow: `inset 3px 0 0 ${modalAccent}`,
                    }}
                  >
                    <Input
                      type="date"
                      value={deadlineDate}
                      aria-label={copy.deadline}
                      onChange={(e) => setDeadlineDate(e.target.value)}
                      className="h-8 w-auto cursor-pointer border-0 bg-transparent px-0 py-0 text-sm font-semibold text-slate-700 shadow-none outline-none focus-visible:ring-0"
                    />
                    <Input
                      type="time"
                      value={deadlineTime}
                      aria-label={copy.deadline}
                      onChange={(e) => setDeadlineTime(e.target.value)}
                      className="h-8 w-auto cursor-pointer border-0 bg-transparent px-0 py-0 text-sm font-semibold text-slate-700 shadow-none outline-none focus-visible:ring-0"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setShowDeadline(false);
                        setDeadlineDate("");
                        setDeadlineTime("");
                      }}
                      className="ml-auto h-7 w-7 cursor-pointer rounded-full p-1 text-slate-500 hover:bg-slate-200 hover:text-slate-800"
                      aria-label={copy.close}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </QuickRow>
            )}

            {/* Description */}
            <QuickRow icon={<AlignLeft className="h-5 w-5" />}>
              <Textarea
                {...register("description")}
                aria-label={copy.addDescription}
                rows={3}
                placeholder={copy.addDescriptionAttachment}
                className="min-h-[42px] w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-2xs outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus-visible:border-blue-500 focus-visible:ring-2 focus-visible:ring-blue-100"
              />
            </QuickRow>

            {/* Calendar Selector */}
            {kind === "task" ? (
              <QuickRow
                icon={
                  <ListTodo
                    className="h-5 w-5"
                    style={{ color: tasksColor || "#f59e0b" }}
                  />
                }
              >
                <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-2xs transition hover:border-slate-300">
                  <div className="flex items-center gap-2">
                    <span
                      className="h-3 w-3 shrink-0 rounded-full"
                      style={{ backgroundColor: tasksColor || "#f59e0b" }}
                    />
                    <span className="text-sm font-semibold text-slate-700">
                      {copy.task}
                    </span>
                  </div>
                  <p className="mt-0.5 truncate text-xs text-slate-500">
                    {reminders && reminders.length > 0
                      ? `${copy.myTasks} · ${formatReminderSummary(reminders)}`
                      : copy.myTasks}
                  </p>
                </div>
              </QuickRow>
            ) : (
              <QuickRow icon={<CalendarDays className="h-5 w-5" />}>
                <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-2xs transition hover:border-slate-300">
                  <div className="flex items-center gap-2">
                    <CustomSelect
                      value={calendarId}
                      onChange={(value) =>
                        setValue("calendarId", value, { shouldDirty: true })
                      }
                      ariaLabel={copy.calendar}
                      options={calendars.map((cal) => ({
                        value: cal.id,
                        label: cal.name,
                      }))}
                      triggerClassName="h-8 min-w-0 max-w-full cursor-pointer border-0 bg-transparent px-0 text-sm font-medium text-slate-700 shadow-none hover:bg-transparent focus-visible:ring-0"
                      contentClassName="rounded-lg border-slate-200"
                    />
                    <span
                      className="h-3.5 w-3.5 shrink-0 rounded-full"
                      style={{
                        backgroundColor: selectedCalendar?.color || "#2563eb",
                      }}
                    />
                  </div>
                  <p className="mt-0.5 truncate text-xs text-slate-500">
                    {formatReminderSummary(reminders)}
                  </p>
                </div>
              </QuickRow>
            )}

            {showMoreOptions && (
              <div className="space-y-3 border-t border-slate-200/70 pt-4 transition-all duration-300">
                <QuickRow icon={<Bell className="h-5 w-5" />}>
                  <ReminderEditor control={control} />
                </QuickRow>

                <QuickRow icon={<Paperclip className="h-5 w-5" />}>
                  <div className="w-full px-1 py-1">
                    <CalendarDocumentsSection
                      documentIds={controller.documentIds}
                      onChangeDocumentIds={controller.setDocumentIds}
                      busy={submitting}
                    />
                  </div>
                </QuickRow>
              </div>
            )}
          </div>
        </div>

        <div className="flex shrink-0 flex-col gap-3 border-t border-slate-200/70 bg-slate-50/95 px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-7">
          <Button
            type="button"
            variant="ghost"
            onClick={() => setShowMoreOptions((prev) => !prev)}
            className="inline-flex h-9 w-fit cursor-pointer items-center gap-1.5 rounded-full px-3 text-sm font-semibold text-blue-700 transition hover:bg-blue-50 active:scale-[0.98]"
          >
            <span>
              {showMoreOptions ? copy.fewerOptions : copy.moreOptions}
            </span>
            <ChevronDown
              className={`h-4 w-4 transition-transform duration-200 ${
                showMoreOptions ? "rotate-180" : ""
              }`}
            />
          </Button>

          <div className="flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="h-9 cursor-pointer rounded-full border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-100 active:scale-[0.98]"
            >
              {copy.cancel}
            </Button>
            <Button
              type="submit"
              disabled={submitting || formState.isSubmitting}
              className="h-9 cursor-pointer rounded-full bg-blue-700 px-6 text-sm font-semibold text-white shadow-sm shadow-blue-700/20 transition hover:bg-blue-800 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? copy.saving : copy.save}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
