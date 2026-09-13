"use client";

import {
  Check,
  Copy,
  ExternalLink,
  MapPin,
  Trash2,
  Video,
  X,
} from "lucide-react";
import { FormEventHandler, useRef, useState } from "react";
import { useWatch } from "react-hook-form";
import { toast } from "sonner";
import { useAppIntl } from "@/features/i18n/useAppIntl";
import { CalendarEventFormController } from "../../hooks/use-calendar-event-form";
import { useModalDialog } from "../../hooks/use-modal-dialog";
import { CalendarEvent, WorkspaceCalendar } from "../../types/calendar.types";
import { CalendarColorPicker } from "../sidebar/calendar-style-fields";
import { AttendeePicker } from "../workspace/attendee-picker";
import { AttachmentEditor } from "./attachment-editor";
import { EventTimeEditor } from "./event-time-editor";
import { QuickCreateTaskFields } from "./quick-create-task-fields";
import { ReminderEditor } from "./reminder-editor";
import { TaskTimeEditor } from "./task-time-editor";

export type EventFormKind = "event" | "task";

interface EventAdvancedFormProps {
  calendars: WorkspaceCalendar[];
  controller: CalendarEventFormController;
  event?: CalendarEvent | null;
  onClose: () => void;
  submitting?: boolean;
}

const TABS: Array<{ value: EventFormKind; labelId: string }> = [
  { value: "event", labelId: "calendar.quick.event" },
  { value: "task", labelId: "calendar.quick.task" },
];

export function EventAdvancedForm({
  calendars,
  controller,
  event,
  onClose,
  submitting,
}: EventAdvancedFormProps) {
  const intl = useAppIntl();
  const dialogRef = useRef<HTMLFormElement>(null);
  const [kind, setKind] = useState<EventFormKind>("event");
  const isEditing = Boolean(event?.id);

  const [meetUrl, setMeetUrl] = useState<string | null>(() => {
    if (
      event?.location?.includes("meet.google.com") ||
      event?.location?.includes("/meetings/")
    ) {
      return event.location;
    }
    return null;
  });
  const [copiedMeet, setCopiedMeet] = useState(false);

  const personalCalendars = calendars.filter((c) => !c.projectId);
  const displayedCalendars = personalCalendars;

  const { control, formState, register, setValue, getValues } = controller.form;
  const useEventColor = useWatch({ control, name: "useEventColor" });
  const color = useWatch({ control, name: "color" });
  useModalDialog({ dialogRef, onClose });

  const handleAddMeet = () => {
    const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
    const token = Array.from(
      { length: 12 },
      () => chars[Math.floor(Math.random() * chars.length)],
    ).join("");
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const newUrl = `${origin}/meetings/${token}`;
    setMeetUrl(newUrl);

    const currentLocation = getValues("location");
    if (!currentLocation || currentLocation.trim() === "") {
      setValue("location", newUrl, { shouldDirty: true });
    }
    toast.success(
      intl.locale === "vi"
        ? "Đã thêm cuộc họp Meeting"
        : "Meeting video conferencing added",
    );
  };

  const handleCopyMeet = async () => {
    if (!meetUrl) return;
    try {
      await navigator.clipboard.writeText(meetUrl);
      setCopiedMeet(true);
      setTimeout(() => setCopiedMeet(false), 2000);
      toast.success(
        intl.locale === "vi"
          ? "Đã sao chép liên kết cuộc họp Meeting"
          : "Meeting link copied to clipboard",
      );
    } catch {
      // fallback
    }
  };

  const handleRemoveMeet = () => {
    const currentLocation = getValues("location");
    if (currentLocation === meetUrl) {
      setValue("location", "", { shouldDirty: true });
    }
    setMeetUrl(null);
  };

  const handleTabChange = (nextKind: EventFormKind) => {
    setKind(nextKind);
    if (personalCalendars.length > 0) {
      const currentCalId = getValues("calendarId");
      const isPersonal = personalCalendars.some((c) => c.id === currentCalId);
      if (!isPersonal) {
        setValue("calendarId", personalCalendars[0].id, { shouldDirty: true });
      }
    }
  };

  const getHeadingTitle = () => {
    if (isEditing) {
      return intl.formatMessage({ id: "calendar.editEvent" });
    }
    switch (kind) {
      case "task":
        return intl.formatMessage({ id: "calendar.quick.task" });
      default:
        return intl.formatMessage({ id: "calendar.createEvent" });
    }
  };

  const getTitlePlaceholder = () => {
    switch (kind) {
      case "task":
        return intl.formatMessage({ id: "calendar.quick.addTitle" });
      default:
        return intl.formatMessage({ id: "calendar.titlePlaceholder" });
    }
  };

  const handleSubmit: FormEventHandler<HTMLFormElement> = (e) => {
    controller.submit(e);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 p-3 backdrop-blur-xs sm:p-5">
      <form
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="calendar-event-form-heading"
        onSubmit={handleSubmit}
        className="flex max-h-[92dvh] w-full max-w-[38rem] flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-2xl"
      >
        {/* Modal Header */}
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-slate-100 bg-white px-6">
          <h2
            id="calendar-event-form-heading"
            className="text-base font-semibold text-slate-800"
          >
            {getHeadingTitle()}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="grid h-8 w-8 cursor-pointer place-items-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
            aria-label={intl.formatMessage({ id: "app.close" })}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* 3 Tabs Switcher */}
        {!isEditing && (
          <div className="flex shrink-0 items-center border-b border-slate-100 bg-slate-50/80 px-6 py-2.5">
            <div
              className="inline-flex rounded-xl bg-slate-200/70 p-1"
              role="tablist"
              aria-label="Event Type"
            >
              {TABS.map((tab) => {
                const isActive = kind === tab.value;
                return (
                  <button
                    key={tab.value}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => handleTabChange(tab.value)}
                    className={`cursor-pointer rounded-lg px-4 py-1.5 text-xs font-semibold transition-all ${
                      isActive
                        ? "bg-white text-blue-600 shadow-xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    {intl.formatMessage({ id: tab.labelId })}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Modal Body */}
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-5">
          {/* Title Input */}
          <div className="space-y-1">
            <input
              {...register("title")}
              data-modal-initial-focus
              aria-label={getTitlePlaceholder()}
              placeholder={getTitlePlaceholder()}
              aria-invalid={Boolean(formState.errors.title)}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-base font-medium text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
            {formState.errors.title && (
              <p className="text-xs font-medium text-red-600">
                {intl.formatMessage({ id: "calendar.requiredFields" })}
              </p>
            )}
          </div>

          {/* Kind: Event - Time & Recurrence Editor */}
          {kind === "event" && (
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
          )}

          {/* Kind: Task - Dedicated Task Time Editor & Personal Task Fields */}
          {kind === "task" && (
            <>
              <TaskTimeEditor
                startAt={controller.startAt}
                allDay={controller.allDay}
                allDayRegistration={register("allDay")}
                recurrencePreset={controller.recurrencePreset}
                recurrenceOptions={controller.recurrenceOptions}
                onDateChange={(date) => {
                  controller.handleStartDateChange(date);
                  controller.handleEndDateChange(date);
                }}
                onTimeChange={controller.handleStartTimeChange}
                onAllDayChange={controller.handleAllDayChange}
                onRecurrenceChange={controller.handleRecurrenceChange}
              />
              <QuickCreateTaskFields />
            </>
          )}

          {/* Kind: Event - Additional event fields */}
          {kind === "event" && (
            <>
              {/* Meeting video conferencing */}
              <div className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-1.5 transition-all">
                {!meetUrl ? (
                  <button
                    type="button"
                    onClick={handleAddMeet}
                    className="flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-700 transition-colors hover:bg-slate-200/70"
                  >
                    <div className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-blue-600 text-white shadow-xs">
                      <Video className="h-4 w-4" />
                    </div>
                    <span>
                      {intl.locale === "vi"
                        ? "Thêm cuộc họp video Meeting"
                        : "Add Meeting video conferencing"}
                    </span>
                  </button>
                ) : (
                  <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-200/70 bg-white p-2.5 shadow-xs">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-blue-600 text-white shadow-xs">
                        <Video className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <a
                          href={meetUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 hover:underline"
                        >
                          <span>
                            {intl.locale === "vi"
                              ? "Tham gia cuộc họp Meeting"
                              : "Join Meeting"}
                          </span>
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                        <p className="truncate text-xs font-mono text-slate-500">
                          {meetUrl.replace(/^https?:\/\//, "")}
                        </p>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        type="button"
                        onClick={handleCopyMeet}
                        className="grid h-8 w-8 cursor-pointer place-items-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
                        title={
                          intl.locale === "vi"
                            ? "Sao chép đường liên kết"
                            : "Copy link"
                        }
                      >
                        {copiedMeet ? (
                          <Check className="h-4 w-4 text-emerald-600" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={handleRemoveMeet}
                        className="grid h-8 w-8 cursor-pointer place-items-center rounded-lg text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600"
                        title={
                          intl.locale === "vi"
                            ? "Xóa cuộc họp"
                            : "Remove meeting"
                        }
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="relative">
                <MapPin className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  {...register("location")}
                  aria-label={intl.formatMessage({ id: "calendar.location" })}
                  placeholder={intl.formatMessage({
                    id: "calendar.quick.addLocation",
                  })}
                  className="w-full rounded-lg border border-slate-200 bg-white pl-10 pr-3.5 py-2 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="space-y-1.5 block">
                  <span className="text-xs font-medium uppercase tracking-wider text-slate-500">
                    {intl.formatMessage({ id: "nav.calendar" })}
                  </span>
                  <select
                    {...register("calendarId")}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  >
                    {displayedCalendars.map((calendar) => (
                      <option key={calendar.id} value={calendar.id}>
                        {calendar.name}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="space-y-1.5">
                  <span className="text-xs font-medium uppercase tracking-wider text-slate-500">
                    {intl.formatMessage({ id: "calendar.eventColor" })}
                  </span>
                  <div className="space-y-2.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2">
                    <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-medium text-slate-700">
                      <input
                        type="checkbox"
                        checked={useEventColor}
                        onChange={(changeEvent) =>
                          controller.enableEventColor(
                            changeEvent.target.checked,
                          )
                        }
                        className="h-3.5 w-3.5 cursor-pointer rounded border-slate-300 text-blue-600 focus:ring-blue-500"
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

              <div className="space-y-1.5">
                <AttendeePicker
                  attendees={controller.attendees}
                  onChange={controller.setAttendees}
                />
              </div>

              <ReminderEditor control={control} register={register} />
              <AttachmentEditor documentCount={controller.documentIds.length} />
            </>
          )}

          {/* Calendar selector for Task */}
          {kind === "task" && (
            <label className="space-y-1.5 block">
              <span className="text-xs font-medium uppercase tracking-wider text-slate-500">
                {intl.formatMessage({ id: "nav.calendar" })}
              </span>
              <select
                {...register("calendarId")}
                className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                {displayedCalendars.map((calendar) => (
                  <option key={calendar.id} value={calendar.id}>
                    {calendar.name}
                  </option>
                ))}
              </select>
            </label>
          )}

          {/* Description */}
          <div className="space-y-1.5">
            <span className="text-xs font-medium uppercase tracking-wider text-slate-500">
              {intl.formatMessage({ id: "calendar.quick.addDescription" })}
            </span>
            <textarea
              {...register("description")}
              aria-label={intl.formatMessage({
                id: "calendar.descriptionPlaceholder",
              })}
              placeholder={intl.formatMessage({
                id: "calendar.descriptionPlaceholder",
              })}
              rows={3}
              className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-700 outline-none placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex shrink-0 justify-end gap-2.5 border-t border-slate-100 bg-white px-6 py-3.5">
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-800 active:scale-[0.98]"
          >
            {intl.formatMessage({ id: "app.cancel" })}
          </button>
          <button
            type="submit"
            disabled={submitting || formState.isSubmitting}
            className="cursor-pointer rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white shadow-xs transition-all hover:bg-blue-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
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
