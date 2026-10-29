"use client";




import {
  AlignLeft,
  Bell,
  Calendar,
  Check,
  Copy,
  ExternalLink,
  ListTodo,
  MapPin,
  Paperclip,
  Pencil,
  Trash2,
  Users,
  Video,
  X,
} from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useAppSelector } from "@/store/store";
import { useAttendeeProfiles } from "../../hooks/use-calendar-users";
import { useCalendarEvent, useRetryCalendarConference } from "../../hooks/use-calendar-queries";
import { buildCalendarMeetingUrl } from "../../utils/calendar-conference.utils";

import { CalendarDocumentsSection } from "./calendar-documents-section";
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
import { CalendarTaskFocusButton } from "@/features/pomodoro/components/task-focus-button";
import { TaskFocusHistory } from "@/features/pomodoro/components/task-focus-history";
import { DialogSurface } from "@/components/ui/dialog";

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
  const retryConference = useRetryCalendarConference();
  const currentUserId = useAppSelector((state) => state.auth.userId);
  const dialogRef = useRef<HTMLDivElement>(null);
  const resolvedProfiles = useAttendeeProfiles(event, open);


  const [copiedMeeting, setCopiedMeeting] = useState(false);
  const [showDeleteScopeModal, setShowDeleteScopeModal] = useState(false);
  const [cancelScope, setCancelScope] = useState(RecurrenceScope.THIS);
  const [pendingAction, setPendingAction] = useState<"delete" | "accept" | "decline" | "complete" | null>(null);

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
    setPendingAction("delete");
    if (isRecurring) {
      setShowDeleteScopeModal(true);
      return;
    }
    onCancelEvent(RecurrenceScope.THIS);
  };

  const handleConfirmDeleteScope = () => {
    setPendingAction("delete");
    setShowDeleteScopeModal(false);
    onCancelEvent(cancelScope);
  };

  const handleCopyMeeting = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedMeeting(true);
      setTimeout(() => setCopiedMeeting(false), 2000);
      toast.success("Meeting link copied to clipboard");
    } catch {
      // fallback
    }
  };

  const meetingUrl = event.conference?.status === "READY" && event.conference.joinToken ? buildCalendarMeetingUrl(event.conference.joinToken) : event.location?.includes("meet.google.com") ? event.location : null;
  const hasMeeting = Boolean(meetingUrl);

  const hasPhysicalLocation = event.location && !event.location.includes("meet.google.com");

  const reminderText =
    event.reminders && event.reminders.length > 0
      ? event.reminders
          .map((r) => formatReminderLabel(r.minutesBefore))
          .join(", ")
      : "No reminders";

  const calendarName =
    event.calendar?.name ||
    event.creatorProfile?.fullName ||
    event.creatorProfile?.email ||
    "My Calendar";

  const eventColor =
    (isTask ? tasksColor : undefined) ||
    event.color ||
    event.calendar?.color ||
    "var(--warning)";

  const cleanedDescription = cleanTaskDescription(event.description);

  return typeof document === "undefined" ? null : <DialogSurface onClose={onClose}>{(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-overlay/40 p-4"
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


        aria-labelledby="calendar-event-detail-heading"
        className="relative flex max-h-[calc(100dvh-2rem)] min-w-0 w-full max-w-[460px] flex-col overflow-hidden rounded-dialog border border-border bg-card transition-all"
      >
        {/* Top Header Action Toolbar (Google Calendar style) */}
        <div className="flex h-12 shrink-0 items-center justify-end gap-1 px-3 pt-2 text-muted-foreground">
          {event.permissions?.canManage && (
            <>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={onEdit}
                aria-label="Edit event"
                title="Edit event"
                className="grid h-9 w-9 cursor-pointer place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <Pencil className="h-4 w-4" />
              </Button>

              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={handleDelete}
                loading={busy && pendingAction === "delete"}
                disabled={busy}
                aria-label="Cancel event"
                title="Cancel event"
                className="grid h-9 w-9 cursor-pointer place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-destructive-content disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </>
          )}

          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onClose}
            aria-label="Close"
            title="Close"
            className="grid h-9 w-9 cursor-pointer place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Modal Body with Left Icon Column and Right Aligned Content */}
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 pb-5 pt-1 sm:px-6">
          {/* Row 1: Title and Date/Time */}
          <div className="flex items-start gap-4">
            <div className="mt-1 flex w-5 shrink-0 justify-center">
              <span
                className="h-4 w-4 shrink-0 rounded-md"
                style={{ backgroundColor: eventColor }}
              />
            </div>
            <div className="min-w-0 flex-1">
              <h2
                id="calendar-event-detail-heading"
                className={`text-2xl font-normal leading-tight text-foreground break-words ${
                  isCompletedTask ? "line-through" : ""
                }`}
              >
                {event.title}
              </h2>
              <p className="mt-1 text-sm font-normal text-muted-foreground">
                {formatCalendarEventRange(event, "en")}
              </p>
            </div>
          </div>

          {isTask && currentUserId && event.calendar?.ownerUserId === currentUserId && !event.calendar.projectId && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center"><CalendarTaskFocusButton event={event} /></div>
              <TaskFocusHistory target={{ eventId: event.id }} />
            </div>
          )}

          {/* Row 2: Reminders (Bell icon) */}
          <div className="flex items-start gap-4">
            <div className="mt-0.5 flex w-5 shrink-0 justify-center">
              <Bell className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="min-w-0 flex-1 text-sm text-foreground">
              {reminderText}
            </div>
          </div>

          {/* Row 3: Calendar / Tasks Name */}
          <div className="flex items-start gap-4">
            <div className="mt-0.5 flex w-5 shrink-0 justify-center">
              {isTask ? (
                <ListTodo
                  className="h-4 w-4 text-info-content"
                />
              ) : (
                <Calendar className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
            <div className="min-w-0 flex-1 text-sm text-foreground">
              {isTask ? "Tasks" : calendarName}
            </div>
          </div>

          {/* Row 4: Meeting Video Conferencing (if present) */}
          {event.conference?.enabled && ["PENDING", "FAILED"].includes(event.conference.status) && (
            <div role="status" className="space-y-2 rounded-control border border-border p-3 text-sm">
              <p>{event.conference.status === "FAILED" ? "Meeting preparation failed. Your event is saved; preparation will retry automatically." : "Your event is saved. The meeting link is being prepared."}</p>
              {event.permissions?.canManage && <Button type="button" size="sm" variant="outline" loading={retryConference.isPending} onClick={() => retryConference.mutate(event.id, { onError: () => toast.error("Unable to retry meeting preparation. Please try again.") })}>Retry now</Button>}
            </div>
          )}
          {hasMeeting && (
            <div className="flex items-start gap-4">
              <div className="mt-1 flex w-5 shrink-0 justify-center">
                <Video className="h-4 w-4 text-info-content" />
              </div>
              <div className="min-w-0 flex-1 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <a
                    href={meetingUrl!}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 rounded-panel bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground transition hover:bg-primary"
                  >
                    <span>
                      {meetingUrl!.includes("meet.google.com")
                        ? "Join with Google Meet"
                        : meetingUrl!.includes("/meetings/")
                          ? "Join with Workspace Hub Meeting"
                          : "Join Meeting"}
                    </span>
                    <ExternalLink className="h-3.5 w-3.5 opacity-80" />
                  </a>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => handleCopyMeeting(meetingUrl!)}
                    className="grid h-8 w-8 cursor-pointer place-items-center rounded-control text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    title="Copy meeting link"
                  >
                    {copiedMeeting ? (
                      <Check className="h-4 w-4 text-success-content" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <p className="truncate text-xs font-mono text-muted-foreground">
                  {meetingUrl!.replace(/^https?:\/\//, "")}
                </p>
              </div>
            </div>
          )}

          {/* Row 5: Physical Location (if present) */}
          {hasPhysicalLocation && (
            <div className="flex items-start gap-4">
              <div className="mt-0.5 flex w-5 shrink-0 justify-center">
                <MapPin className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="min-w-0 flex-1">
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                    event.location!,
                  )}`}
                  target="_blank"
                  rel="noreferrer"
                  className="group flex items-start gap-1.5 text-sm font-medium text-foreground transition hover:text-info-content"
                  title="Open in Google Maps"
                >
                  <span className="break-words whitespace-normal leading-relaxed group-hover:underline">
                    {event.location}
                  </span>
                  <ExternalLink className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground transition group-hover:text-info-content" />
                </a>
              </div>
            </div>
          )}

          {/* Row 6: Description (if present) */}
          {cleanedDescription && (
            <div className="flex items-start gap-4">
              <div className="mt-0.5 flex w-5 shrink-0 justify-center">
                <AlignLeft className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="min-w-0 flex-1 whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                {cleanedDescription}
              </div>
            </div>
          )}

          {/* Row 7: Attendees (if present) */}
          {guestAttendees.length > 0 && (
            <div className="flex items-start gap-4">
              <div className="mt-0.5 flex w-5 shrink-0 justify-center">
                <Users className="h-4 w-4 text-muted-foreground" />
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

          {/* Row 8: Attached documents */}
          {event.documentIds.length > 0 && (
            <div className="flex items-start gap-4">
              <div className="mt-0.5 flex w-5 shrink-0 justify-center">
                <Paperclip className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="min-w-0 flex-1">
                <CalendarDocumentsSection
                  documentIds={event.documentIds}
                  isReadOnly={true}
                  hideHeader={true}
                />
              </div>
            </div>
          )}
        </div>

        {/* Guest RSVP Footer Bar */}
        {event.permissions?.canRespond && !event.permissions.canManage && (
          <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-border bg-background px-6 py-3.5">
            <span className="text-xs font-semibold text-muted-foreground">Going?</span>
            <div className="inline-flex rounded-full bg-accent/80 p-1">
              <Button
                type="button"
                variant="ghost"
                loading={busy && pendingAction === "accept"}
                onClick={() => {
                  setPendingAction("accept");
                  onRespond(AttendeeResponseStatus.ACCEPTED);
                }}
                disabled={busy}
                className={`inline-flex h-auto cursor-pointer items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-semibold transition-all ${
                  myResponseStatus === AttendeeResponseStatus.ACCEPTED
                    ? "bg-success text-success-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-border/40"
                }`}
              >
                {myResponseStatus === AttendeeResponseStatus.ACCEPTED && (
                  <Check className="h-3.5 w-3.5 stroke-[3]" />
                )}
                <span>Yes</span>
              </Button>
              <Button
                type="button"
                variant="ghost"
                loading={busy && pendingAction === "decline"}
                onClick={() => {
                  setPendingAction("decline");
                  onRespond(AttendeeResponseStatus.DECLINED);
                }}
                disabled={busy}
                className={`inline-flex h-auto cursor-pointer items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-semibold transition-all ${
                  myResponseStatus === AttendeeResponseStatus.DECLINED
                    ? "bg-destructive text-destructive-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-border/40"
                }`}
              >
                {myResponseStatus === AttendeeResponseStatus.DECLINED && (
                  <Check className="h-3.5 w-3.5 stroke-[3]" />
                )}
                <span>No</span>
              </Button>
            </div>
          </div>
        )}

        {isTask && event.permissions?.canManage && (
          <div className="flex justify-end border-t border-border bg-background px-6 py-4">
            <Button
              type="button"
              loading={busy && pendingAction === "complete"}
              onClick={() => {
                setPendingAction("complete");
                onTaskCompletionChange();
              }}
              disabled={busy}
              className="cursor-pointer rounded-full bg-info-soft px-5 py-2.5 text-sm font-semibold text-info-content transition-colors hover:bg-info-soft disabled:cursor-wait disabled:opacity-60"
            >
              {isCompletedTask ? "Mark as incomplete" : "Mark as completed"}
            </Button>
          </div>
        )}

        {/* Recurrence Delete Confirmation Dialog */}
        {showDeleteScopeModal && (
          <CalendarConfirmDialog
            open={showDeleteScopeModal}
            title="Delete recurring event"
            description="Choose the scope you want to apply when deleting this event:"
            confirmLabel="Delete event"
            cancelLabel="Cancel"
            variant="danger"
            isLoading={busy}
            onCancel={() => setShowDeleteScopeModal(false)}
            onConfirm={handleConfirmDeleteScope}
          >
            <CalendarRadioGroup<RecurrenceScope>
              name="recurrence-delete-scope"
              value={cancelScope}
              ariaLabel="Delete event"
              onChange={setCancelScope}
              options={[
                {
                  value: RecurrenceScope.THIS,
                  label: "This event",
                },
                {
                  value: RecurrenceScope.THIS_AND_FOLLOWING,
                  label: "This and following events",
                },
                {
                  value: RecurrenceScope.ALL,
                  label: "All events in series",
                },
              ]}
            />
          </CalendarConfirmDialog>
        )}
      </div>
    </div>
  )}</DialogSurface>;
}
