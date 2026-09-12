"use client";

import {
  AlignLeft,
  Bell,
  Calendar,
  Check,
  Copy,
  ExternalLink,
  List,
  Mail,
  MapPin,
  MoreVertical,
  Paperclip,
  Pencil,
  Printer,
  Repeat,
  Trash2,
  Users,
  Video,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useAppIntl } from "@/features/i18n/useAppIntl";
import { useAttendeeProfiles } from "../../hooks/use-calendar-users";
import { useModalDialog } from "../../hooks/use-modal-dialog";
import {
  AttendeeResponseStatus,
  CalendarEvent,
  EventSourceType,
  RecurrenceScope,
} from "../../types/calendar.types";
import {
  formatCalendarEventRange,
  formatReminderLabel,
} from "../../utils/calendar-date.utils";
import {
  cleanTaskDescription,
  isTaskCalendarEvent,
} from "../../utils/calendar-event.utils";
import { formatRecurrenceRuleText } from "../../utils/calendar-recurrence.utils";
import { EventAttendeeList } from "./event-attendee-list";

export function EventDetailModal({
  event,
  open,
  tasksColor,
  onClose,
  onEdit,
  onCancelEvent,
  onRespond,
  busy,
}: {
  event: CalendarEvent | null;
  open: boolean;
  tasksColor?: string;
  onClose: () => void;
  onEdit: () => void;
  onCancelEvent: (scope: RecurrenceScope) => void;
  onRespond: (status: AttendeeResponseStatus) => void;
  busy?: boolean;
}) {
  const intl = useAppIntl();
  const dialogRef = useRef<HTMLDivElement>(null);
  const resolvedProfiles = useAttendeeProfiles(event, open);
  useModalDialog({ dialogRef, onClose });

  const [copiedMeeting, setCopiedMeeting] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showDeleteScopeModal, setShowDeleteScopeModal] = useState(false);
  const [cancelScope, setCancelScope] = useState(RecurrenceScope.THIS);
  const moreMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        moreMenuRef.current &&
        !moreMenuRef.current.contains(e.target as Node)
      ) {
        setShowMoreMenu(false);
      }
    }
    if (showMoreMenu) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showMoreMenu]);

  if (!open || !event) return null;

  const guestAttendees =
    event.attendees?.filter(
      (attendee) => attendee.userId !== event.createdBy,
    ) || [];

  const isRecurring = Boolean(event.recurrenceRule || event.recurrenceParentId);
  const recurrenceText = event.recurrenceRule
    ? formatRecurrenceRuleText(event.recurrenceRule, intl.locale, event.startAt)
    : event.recurrenceParentId
      ? intl.locale === "vi"
        ? "Sự kiện định kỳ"
        : "Recurring event"
      : null;

  const handleDelete = () => {
    if (isRecurring) {
      setShowDeleteScopeModal(true);
      return;
    }
    onCancelEvent(RecurrenceScope.THIS);
  };

  const handleConfirmDeleteScope = () => {
    setShowDeleteScopeModal(false);
    onCancelEvent(cancelScope);
  };

  const handleEmailGuests = () => {
    const emails = guestAttendees
      .map(
        (a) =>
          a.profile?.email || resolvedProfiles[a.userId]?.email || null,
      )
      .filter(Boolean) as string[];
    if (emails.length > 0) {
      window.location.href = `mailto:${emails.join(",")}?subject=${encodeURIComponent(event.title)}`;
    } else {
      const info = `${event.title} (${formatCalendarEventRange(event, intl.locale)})`;
      navigator.clipboard.writeText(info).then(() => {
        toast.success(
          intl.locale === "vi"
            ? "Đã sao chép thông tin sự kiện"
            : "Event details copied to clipboard",
        );
      });
    }
  };

  const handleCopyLink = () => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const eventUrl = `${origin}/calendar?event=${event.id}`;
    navigator.clipboard.writeText(eventUrl).then(() => {
      setShowMoreMenu(false);
      toast.success(
        intl.locale === "vi"
          ? "Đã sao chép liên kết sự kiện"
          : "Event link copied to clipboard",
      );
    });
  };

  const handlePrint = () => {
    setShowMoreMenu(false);
    window.print();
  };

  const handleCopyMeeting = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedMeeting(true);
      setTimeout(() => setCopiedMeeting(false), 2000);
      toast.success(
        intl.locale === "vi"
          ? "Đã sao chép liên kết cuộc họp"
          : "Meeting link copied to clipboard",
      );
    } catch {
      // fallback
    }
  };

  const hasMeeting =
    event.location &&
    (event.location.includes("/meetings/") ||
      event.location.includes("meet.google.com"));

  const hasPhysicalLocation = event.location && !hasMeeting;

  const reminderText =
    event.reminders && event.reminders.length > 0
      ? event.reminders
          .map((r) => formatReminderLabel(r.minutesBefore, intl.locale))
          .join(", ")
      : intl.locale === "vi"
        ? "30 phút trước"
        : "30 minutes before";

  const isTask = isTaskCalendarEvent(event);

  const calendarName =
    isTask
      ? intl.formatMessage({ id: "calendar.quick.myTasks" })
      : event.calendar?.name ||
        event.creatorProfile?.fullName ||
        event.creatorProfile?.email ||
        (intl.locale === "vi" ? "Lịch của tôi" : "My Calendar");

  const eventColor =
    isTask
      ? tasksColor || "#f59e0b"
      : event.color || event.calendar?.color || "#ea580c";

  const displayDescription = isTask
    ? cleanTaskDescription(event.description)
    : event.description;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-xs">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="calendar-event-detail-heading"
        className="relative w-full max-w-[460px] overflow-hidden rounded-3xl border border-slate-200/90 bg-white shadow-[0_20px_60px_-15px_rgba(0,0,0,0.25)] transition-all"
      >
        {/* Top Header Action Toolbar (Google Calendar style) */}
        <div className="flex h-12 items-center justify-end gap-1 px-3 pt-2 text-slate-500">
          {event.permissions?.canManage && (
            <>
              <button
                type="button"
                onClick={onEdit}
                aria-label={intl.formatMessage({ id: "calendar.editEvent" })}
                title={intl.formatMessage({ id: "calendar.editEvent" })}
                className="grid h-9 w-9 cursor-pointer place-items-center rounded-full text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
              >
                <Pencil className="h-4 w-4" />
              </button>

              <button
                type="button"
                onClick={handleDelete}
                disabled={busy}
                aria-label={intl.formatMessage({ id: "calendar.cancelEvent" })}
                title={intl.formatMessage({ id: "calendar.cancelEvent" })}
                className="grid h-9 w-9 cursor-pointer place-items-center rounded-full text-slate-600 transition-colors hover:bg-slate-100 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </>
          )}

          <button
            type="button"
            onClick={handleEmailGuests}
            aria-label={intl.locale === "vi" ? "Gửi email cho khách" : "Email guests"}
            title={intl.locale === "vi" ? "Gửi email cho khách" : "Email guests"}
            className="grid h-9 w-9 cursor-pointer place-items-center rounded-full text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
          >
            <Mail className="h-4 w-4" />
          </button>

          <div className="relative" ref={moreMenuRef}>
            <button
              type="button"
              onClick={() => setShowMoreMenu((prev) => !prev)}
              aria-label={intl.locale === "vi" ? "Tùy chọn khác" : "More options"}
              title={intl.locale === "vi" ? "Tùy chọn khác" : "More options"}
              className="grid h-9 w-9 cursor-pointer place-items-center rounded-full text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
            >
              <MoreVertical className="h-4 w-4" />
            </button>

            {showMoreMenu && (
              <div className="absolute right-0 top-10 z-20 w-52 rounded-xl border border-slate-200 bg-white py-1.5 shadow-xl">
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="flex w-full cursor-pointer items-center gap-2.5 px-4 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  <Copy className="h-3.5 w-3.5 text-slate-400" />
                  <span>
                    {intl.locale === "vi"
                      ? "Sao chép liên kết sự kiện"
                      : "Copy event link"}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={handlePrint}
                  className="flex w-full cursor-pointer items-center gap-2.5 px-4 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  <Printer className="h-3.5 w-3.5 text-slate-400" />
                  <span>
                    {intl.locale === "vi" ? "In sự kiện" : "Print event"}
                  </span>
                </button>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label={intl.formatMessage({ id: "app.close" })}
            title={intl.formatMessage({ id: "app.close" })}
            className="grid h-9 w-9 cursor-pointer place-items-center rounded-full text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Modal Body with Left Icon Column and Right Aligned Content */}
        <div className="space-y-4 px-6 pb-6 pt-1">
          {/* Row 1: Title and Date/Time */}
          <div className="flex items-start gap-4">
            <div className="mt-1 flex w-5 shrink-0 justify-center">
              <span
                className="h-4 w-4 shrink-0 rounded-md shadow-xs"
                style={{ backgroundColor: eventColor }}
              />
            </div>
            <div className="min-w-0 flex-1">
              <h2
                id="calendar-event-detail-heading"
                className="text-2xl font-normal leading-tight text-slate-900 break-words"
              >
                {event.title}
              </h2>
              <p className="mt-1 text-sm font-normal text-slate-600">
                {formatCalendarEventRange(event, intl.locale)}
              </p>
              {recurrenceText && (
                <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
                  <Repeat className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                  <span>{recurrenceText}</span>
                </div>
              )}
            </div>
          </div>

          {/* Row 2: Reminders (Bell icon) */}
          <div className="flex items-start gap-4">
            <div className="mt-0.5 flex w-5 shrink-0 justify-center">
              <Bell className="h-4 w-4 text-slate-500" />
            </div>
            <div className="min-w-0 flex-1 text-sm text-slate-700">
              {reminderText}
            </div>
          </div>

          {/* Row 3: Calendar Name (Calendar / List icon) */}
          <div className="flex items-start gap-4">
            <div className="mt-0.5 flex w-5 shrink-0 justify-center">
              {isTask ? (
                <List className="h-4 w-4 text-slate-500" />
              ) : (
                <Calendar className="h-4 w-4 text-slate-500" />
              )}
            </div>
            <div className="min-w-0 flex-1 text-sm text-slate-700">
              {calendarName}
            </div>
          </div>

          {/* Row 4: Meeting Video Conferencing (if present) */}
          {hasMeeting && (
            <div className="flex items-start gap-4">
              <div className="mt-1 flex w-5 shrink-0 justify-center">
                <Video className="h-4 w-4 text-blue-600" />
              </div>
              <div className="min-w-0 flex-1 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <a
                    href={event.location!}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-blue-700 active:scale-[0.98]"
                  >
                    <span>
                      {event.location!.includes("meet.google.com")
                        ? intl.locale === "vi"
                          ? "Tham gia bằng Google Meet"
                          : "Join with Google Meet"
                        : intl.locale === "vi"
                          ? "Tham gia cuộc họp Meeting"
                          : "Join Meeting"}
                    </span>
                    <ExternalLink className="h-3.5 w-3.5 opacity-80" />
                  </a>
                  <button
                    type="button"
                    onClick={() => handleCopyMeeting(event.location!)}
                    className="grid h-8 w-8 cursor-pointer place-items-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800"
                    title={
                      intl.locale === "vi"
                        ? "Sao chép liên kết"
                        : "Copy meeting link"
                    }
                  >
                    {copiedMeeting ? (
                      <Check className="h-4 w-4 text-emerald-600" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </button>
                </div>
                <p className="truncate text-xs font-mono text-slate-500">
                  {event.location!.replace(/^https?:\/\//, "")}
                </p>
              </div>
            </div>
          )}

          {/* Row 5: Physical Location (if present) */}
          {hasPhysicalLocation && (
            <div className="flex items-start gap-4">
              <div className="mt-0.5 flex w-5 shrink-0 justify-center">
                <MapPin className="h-4 w-4 text-slate-500" />
              </div>
              <div className="min-w-0 flex-1 text-sm text-slate-700">
                {event.location}
              </div>
            </div>
          )}

          {/* Row 6: Description (if present) */}
          {displayDescription && (
            <div className="flex items-start gap-4">
              <div className="mt-0.5 flex w-5 shrink-0 justify-center">
                <AlignLeft className="h-4 w-4 text-slate-500" />
              </div>
              <div className="min-w-0 flex-1 whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
                {displayDescription}
              </div>
            </div>
          )}

          {/* Row 7: Attendees (if present) */}
          {guestAttendees.length > 0 && (
            <div className="flex items-start gap-4">
              <div className="mt-0.5 flex w-5 shrink-0 justify-center">
                <Users className="h-4 w-4 text-slate-500" />
              </div>
              <div className="min-w-0 flex-1">
                <EventAttendeeList
                  attendees={guestAttendees}
                  resolvedProfiles={resolvedProfiles}
                />
              </div>
            </div>
          )}

          {/* Row 8: Attached documents (if present) */}
          {event.documentIds.length > 0 && (
            <div className="flex items-start gap-4">
              <div className="mt-0.5 flex w-5 shrink-0 justify-center">
                <Paperclip className="h-4 w-4 text-slate-500" />
              </div>
              <div className="min-w-0 flex-1 text-sm text-slate-600">
                {intl.formatMessage(
                  { id: "calendar.attachedDocuments" },
                  { count: event.documentIds.length },
                )}
              </div>
            </div>
          )}

          {/* Row 9: RSVP Options (if guest) */}
          {event.permissions?.canRespond && !event.permissions.canManage && (
            <div className="mt-4 border-t border-slate-100 pt-4">
              <p className="mb-2 text-xs font-semibold text-slate-500">
                {intl.locale === "vi" ? "Bạn có tham gia không?" : "Going?"}
              </p>
              <div className="grid grid-cols-3 gap-2">
                {[
                  {
                    status: AttendeeResponseStatus.ACCEPTED,
                    hover:
                      "hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700",
                  },
                  {
                    status: AttendeeResponseStatus.TENTATIVE,
                    hover:
                      "hover:border-amber-300 hover:bg-amber-50 hover:text-amber-700",
                  },
                  {
                    status: AttendeeResponseStatus.DECLINED,
                    hover:
                      "hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700",
                  },
                ].map(({ status, hover }) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => onRespond(status)}
                    disabled={busy}
                    className={`cursor-pointer rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition-colors active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 ${hover}`}
                  >
                    {intl.formatMessage({ id: `calendar.response.${status}` })}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>


        {/* Recurrence Delete Confirmation Dialog */}
        {showDeleteScopeModal && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
            <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
              <h3 className="text-base font-semibold text-slate-900">
                {intl.locale === "vi"
                  ? `Xóa sự kiện định kỳ "${event.title}"`
                  : `Delete recurring event "${event.title}"`}
              </h3>
              <p className="mt-1 text-xs text-slate-500">
                {intl.locale === "vi"
                  ? "Chọn phạm vi bạn muốn áp dụng khi xóa sự kiện này:"
                  : "Choose which events in this series you want to delete:"}
              </p>

              <div className="mt-4 space-y-2">
                {[
                  {
                    value: RecurrenceScope.THIS,
                    label: intl.formatMessage({ id: "calendar.scope.THIS" }),
                  },
                  {
                    value: RecurrenceScope.THIS_AND_FOLLOWING,
                    label: intl.formatMessage({
                      id: "calendar.scope.THIS_AND_FOLLOWING",
                    }),
                  },
                  {
                    value: RecurrenceScope.ALL,
                    label: intl.formatMessage({ id: "calendar.scope.ALL" }),
                  },
                ].map((option) => (
                  <label
                    key={option.value}
                    className={`flex cursor-pointer items-center gap-2.5 rounded-xl border p-2.5 text-xs font-medium transition ${
                      cancelScope === option.value
                        ? "border-blue-500 bg-blue-50/50 text-blue-900"
                        : "border-slate-200 text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <input
                      type="radio"
                      name="recurrence-delete-scope"
                      value={option.value}
                      checked={cancelScope === option.value}
                      onChange={() => setCancelScope(option.value)}
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    <span>{option.label}</span>
                  </label>
                ))}
              </div>

              <div className="mt-5 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowDeleteScopeModal(false)}
                  className="cursor-pointer rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  {intl.formatMessage({ id: "app.cancel" })}
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDeleteScope}
                  disabled={busy}
                  className="cursor-pointer rounded-xl bg-rose-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-rose-700 disabled:opacity-60"
                >
                  {intl.formatMessage({ id: "calendar.cancelEvent" })}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
