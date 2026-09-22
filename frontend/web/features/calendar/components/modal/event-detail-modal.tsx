"use client";

import {
  AlignLeft,
  Bell,
  Calendar,
  Check,
  Copy,
  ExternalLink,
  ListTodo,
  Mail,
  MapPin,
  MoreVertical,
  Paperclip,
  Pencil,
  Printer,
  Trash2,
  Users,
  Video,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useAppSelector } from "@/store/store";
import { useAppIntl } from "@/features/i18n/useAppIntl";
import { useAttendeeProfiles } from "../../hooks/use-calendar-users";
import { useCalendarEvent } from "../../hooks/use-calendar-queries";
import { useModalDialog } from "../../hooks/use-modal-dialog";
import {
  AttendeeResponseStatus,
  CalendarEvent,
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
import { CalendarConfirmDialog } from "../ui/calendar-confirm-dialog";
import { CalendarRadioGroup } from "../ui/calendar-radio-group";
import { EventAttendeeList } from "./event-attendee-list";

export function EventDetailModal({
  event: initialEvent,
  open,
  onClose,
  onEdit,
  onCancelEvent,
  onRespond,
  onTaskCompletionChange,
  tasksColor,
  busy,
}: {
  event: CalendarEvent | null;
  open: boolean;
  onClose: () => void;
  onEdit: () => void;
  onCancelEvent: (scope: RecurrenceScope) => void;
  onRespond: (status: AttendeeResponseStatus) => void;
  onTaskCompletionChange: () => void;
  tasksColor?: string;
  busy?: boolean;
}) {
  const { data: freshEvent } = useCalendarEvent(
    open && initialEvent ? initialEvent.id : null,
  );
  const event = freshEvent ?? initialEvent;
  const intl = useAppIntl();
  const currentUserId = useAppSelector((state) => state.auth.userId);
  const dialogRef = useRef<HTMLDivElement>(null);
  const resolvedProfiles = useAttendeeProfiles(event, open);
  useModalDialog({ dialogRef, onClose, lockDocumentScroll: false });

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

  const myAttendee =
    guestAttendees.find((a) => a.userId === currentUserId) ??
    (guestAttendees.length === 1 ? guestAttendees[0] : undefined);
  const myResponseStatus = myAttendee?.responseStatus;

  const isRecurring = Boolean(event.recurrenceRule || event.recurrenceParentId);
  const isTask = isTaskCalendarEvent(event);
  const isCompletedTask = isTask && Boolean(event.completedAt);

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
      .map((a) => a.profile?.email || resolvedProfiles[a.userId]?.email || null)
      .filter(Boolean) as string[];
    if (emails.length > 0) {
      window.location.href = `mailto:${emails.join(",")}?subject=${encodeURIComponent(event.title)}`;
    } else {
      const info = `${event.title} (${formatCalendarEventRange(event, intl.locale)})`;
      navigator.clipboard.writeText(info).then(() => {
        toast.success(
          intl.locale === "vi"
            ? "ÄÃ£ sao chÃ©p thÃ´ng tin sá»± kiá»‡n"
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
          ? "ÄÃ£ sao chÃ©p liÃªn káº¿t sá»± kiá»‡n"
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
          ? "ÄÃ£ sao chÃ©p liÃªn káº¿t cuá»™c há»p"
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
        ? "30 phÃºt trÆ°á»›c"
        : "30 minutes before";

  const calendarName =
    event.calendar?.name ||
    event.creatorProfile?.fullName ||
    event.creatorProfile?.email ||
    (intl.locale === "vi" ? "Lá»‹ch cá»§a tÃ´i" : "My Calendar");

  const eventColor =
    (isTask ? tasksColor : undefined) ||
    event.color ||
    event.calendar?.color ||
    "#ea580c";

  const cleanedDescription = cleanTaskDescription(event.description);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-xs"
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
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={onEdit}
                aria-label={intl.formatMessage({ id: "calendar.editEvent" })}
                title={intl.formatMessage({ id: "calendar.editEvent" })}
                className="grid h-9 w-9 cursor-pointer place-items-center rounded-full text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
              >
                <Pencil className="h-4 w-4" />
              </Button>

              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={handleDelete}
                disabled={busy}
                aria-label={intl.formatMessage({ id: "calendar.cancelEvent" })}
                title={intl.formatMessage({ id: "calendar.cancelEvent" })}
                className="grid h-9 w-9 cursor-pointer place-items-center rounded-full text-slate-600 transition-colors hover:bg-slate-100 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </>
          )}

          {!isTask && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={handleEmailGuests}
              aria-label={
                intl.locale === "vi" ? "Gá»­i email cho khÃ¡ch" : "Email guests"
              }
              title={
                intl.locale === "vi" ? "Gá»­i email cho khÃ¡ch" : "Email guests"
              }
              className="grid h-9 w-9 cursor-pointer place-items-center rounded-full text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
            >
              <Mail className="h-4 w-4" />
            </Button>
          )}

          <div className="relative" ref={moreMenuRef}>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setShowMoreMenu((prev) => !prev)}
              aria-label={
                intl.locale === "vi" ? "TÃ¹y chá»n khÃ¡c" : "More options"
              }
              title={intl.locale === "vi" ? "TÃ¹y chá»n khÃ¡c" : "More options"}
              className="grid h-9 w-9 cursor-pointer place-items-center rounded-full text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
            >
              <MoreVertical className="h-4 w-4" />
            </Button>

            {showMoreMenu && (
              <div className="absolute right-0 top-10 z-20 w-52 rounded-xl border border-slate-200 bg-white py-1.5 shadow-xl">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleCopyLink}
                  className="flex h-auto w-full cursor-pointer items-center justify-start gap-2.5 rounded-none px-4 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  <Copy className="h-3.5 w-3.5 text-slate-400" />
                  <span>
                    {intl.locale === "vi"
                      ? "Sao chÃ©p liÃªn káº¿t sá»± kiá»‡n"
                      : "Copy event link"}
                  </span>
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handlePrint}
                  className="flex h-auto w-full cursor-pointer items-center justify-start gap-2.5 rounded-none px-4 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  <Printer className="h-3.5 w-3.5 text-slate-400" />
                  <span>
                    {intl.locale === "vi" ? "In sá»± kiá»‡n" : "Print event"}
                  </span>
                </Button>
              </div>
            )}
          </div>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onClose}
            aria-label={intl.formatMessage({ id: "app.close" })}
            title={intl.formatMessage({ id: "app.close" })}
            className="grid h-9 w-9 cursor-pointer place-items-center rounded-full text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
          >
            <X className="h-4 w-4" />
          </Button>
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
                className={`text-2xl font-normal leading-tight text-slate-900 break-words ${
                  isCompletedTask ? "line-through opacity-60" : ""
                }`}
              >
                {event.title}
              </h2>
              <p className="mt-1 text-sm font-normal text-slate-600">
                {formatCalendarEventRange(event, intl.locale)}
              </p>
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

          {/* Row 3: Calendar / Tasks Name */}
          <div className="flex items-start gap-4">
            <div className="mt-0.5 flex w-5 shrink-0 justify-center">
              {isTask ? (
                <ListTodo
                  className="h-4 w-4"
                  style={{ color: tasksColor || "#f59e0b" }}
                />
              ) : (
                <Calendar className="h-4 w-4 text-slate-500" />
              )}
            </div>
            <div className="min-w-0 flex-1 text-sm text-slate-700">
              {isTask
                ? intl.formatMessage({ id: "calendar.tasks" })
                : calendarName}
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
                          ? "Tham gia báº±ng Google Meet"
                          : "Join with Google Meet"
                        : intl.locale === "vi"
                          ? "Tham gia cuá»™c há»p Meeting"
                          : "Join Meeting"}
                    </span>
                    <ExternalLink className="h-3.5 w-3.5 opacity-80" />
                  </a>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => handleCopyMeeting(event.location!)}
                    className="grid h-8 w-8 cursor-pointer place-items-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800"
                    title={
                      intl.locale === "vi"
                        ? "Sao chÃ©p liÃªn káº¿t"
                        : "Copy meeting link"
                    }
                  >
                    {copiedMeeting ? (
                      <Check className="h-4 w-4 text-emerald-600" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
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
          {cleanedDescription && (
            <div className="flex items-start gap-4">
              <div className="mt-0.5 flex w-5 shrink-0 justify-center">
                <AlignLeft className="h-4 w-4 text-slate-500" />
              </div>
              <div className="min-w-0 flex-1 whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
                {cleanedDescription}
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
                  currentUserId={currentUserId}
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
        </div>

        {/* Guest RSVP Footer Bar */}
        {event.permissions?.canRespond && !event.permissions.canManage && (
          <div className="flex items-center justify-between border-t border-slate-200/80 bg-slate-50 px-6 py-3.5">
            <span className="text-xs font-semibold text-slate-600">
              {intl.locale === "vi" ? "Báº¡n cÃ³ tham gia khÃ´ng?" : "Going?"}
            </span>
            <div className="inline-flex rounded-full bg-slate-200/80 p-1">
              <Button
                type="button"
                variant="ghost"
                onClick={() => onRespond(AttendeeResponseStatus.ACCEPTED)}
                disabled={busy}
                className={`inline-flex h-auto cursor-pointer items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-bold transition-all ${
                  myResponseStatus === AttendeeResponseStatus.ACCEPTED
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-300/40"
                }`}
              >
                {myResponseStatus === AttendeeResponseStatus.ACCEPTED && (
                  <Check className="h-3.5 w-3.5 stroke-[3]" />
                )}
                <span>
                  {intl.formatMessage({ id: "calendar.response.ACCEPTED" })}
                </span>
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => onRespond(AttendeeResponseStatus.DECLINED)}
                disabled={busy}
                className={`inline-flex h-auto cursor-pointer items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-bold transition-all ${
                  myResponseStatus === AttendeeResponseStatus.DECLINED
                    ? "bg-rose-600 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-300/40"
                }`}
              >
                {myResponseStatus === AttendeeResponseStatus.DECLINED && (
                  <Check className="h-3.5 w-3.5 stroke-[3]" />
                )}
                <span>
                  {intl.formatMessage({ id: "calendar.response.DECLINED" })}
                </span>
              </Button>
            </div>
          </div>
        )}

        {isTask && event.permissions?.canManage && (
          <div className="flex justify-end border-t border-slate-200 bg-slate-50 px-6 py-4">
            <Button
              type="button"
              onClick={onTaskCompletionChange}
              disabled={busy}
              className="cursor-pointer rounded-full bg-blue-100 px-5 py-2.5 text-sm font-semibold text-blue-800 transition-colors hover:bg-blue-200 disabled:cursor-wait disabled:opacity-60"
            >
              {intl.formatMessage({
                id: isCompletedTask
                  ? "calendar.task.markIncomplete"
                  : "calendar.task.markCompleted",
              })}
            </Button>
          </div>
        )}

        {/* Recurrence Delete Confirmation Dialog */}
        {showDeleteScopeModal && (
          <CalendarConfirmDialog
            open={showDeleteScopeModal}
          title={intl.formatMessage({ id: "calendar.deleteRecurringEvent" })}
          description={intl.formatMessage({
            id: "calendar.deleteRecurringEventDescription",
          })}
            confirmLabel={intl.formatMessage({ id: "calendar.cancelEvent" })}
            cancelLabel={intl.formatMessage({ id: "app.cancel" })}
            variant="danger"
            isLoading={busy}
            onCancel={() => setShowDeleteScopeModal(false)}
            onConfirm={handleConfirmDeleteScope}
          >
          <CalendarRadioGroup<RecurrenceScope>
            name="recurrence-delete-scope"
            value={cancelScope}
            ariaLabel={intl.formatMessage({ id: "calendar.cancelEvent" })}
            onChange={setCancelScope}
            options={[
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
            ]}
          />
          </CalendarConfirmDialog>
        )}
      </div>
    </div>
  );
}
