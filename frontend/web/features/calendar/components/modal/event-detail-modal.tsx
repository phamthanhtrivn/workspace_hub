"use client";

import { Calendar, Clock, MapPin, X } from "lucide-react";
import { useRef } from "react";
import { useAppIntl } from "@/features/i18n/useAppIntl";
import { useAttendeeProfiles } from "../../hooks/use-calendar-users";
import { useModalDialog } from "../../hooks/use-modal-dialog";
import {
  AttendeeResponseStatus,
  CalendarEvent,
  EventSourceType,
  RecurrenceScope,
} from "../../types/calendar.types";
import { formatCalendarEventRange } from "../../utils/calendar-date.utils";
import { EventAttendeeList } from "./event-attendee-list";
import { EventDetailActions } from "./event-detail-actions";

export function EventDetailModal({
  event,
  open,
  onClose,
  onEdit,
  onCancelEvent,
  onRespond,
  busy,
}: {
  event: CalendarEvent | null;
  open: boolean;
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

  if (!open || !event) return null;

  const guestAttendees =
    event.attendees?.filter(
      (attendee) => attendee.userId !== event.createdBy,
    ) || [];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="calendar-event-detail-heading"
        className="w-full max-w-xl overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl"
      >
        <div className="flex items-start justify-between border-b border-slate-200 px-5 py-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span
                className="h-3 w-3 rounded-full"
                style={{ backgroundColor: event.color || event.calendar?.color || "#2563eb" }}
              />
              <h2
                id="calendar-event-detail-heading"
                className="truncate text-xl font-black text-[var(--color-primary-dark)]"
              >
                {event.title}
              </h2>
            </div>
            <p className="mt-1 text-xs font-bold uppercase text-slate-400">
              {event.status}{event.sourceType === EventSourceType.TASK ? " · TASK" : ""}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={intl.formatMessage({ id: "app.close" })}
            className="grid h-9 w-9 cursor-pointer place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 px-5 py-5">
          <div className="flex gap-3 text-sm font-semibold text-slate-600">
            <Clock className="mt-0.5 h-4 w-4 text-slate-400" />
            <span>{formatCalendarEventRange(event, intl.locale)}</span>
          </div>
          {event.calendar && (
            <div className="flex gap-3 text-sm font-semibold text-slate-600">
              <Calendar className="mt-0.5 h-4 w-4 text-slate-400" />
              <span>{event.calendar.name}</span>
            </div>
          )}
          {event.location && (
            <div className="flex gap-3 text-sm font-semibold text-slate-600">
              <MapPin className="mt-0.5 h-4 w-4 text-slate-400" />
              <span>{event.location}</span>
            </div>
          )}
          {event.description && (
            <p className="rounded-lg bg-slate-50 px-3 py-3 text-sm font-medium leading-6 text-slate-600">
              {event.description}
            </p>
          )}

          <EventAttendeeList
            attendees={guestAttendees}
            resolvedProfiles={resolvedProfiles}
          />

          {event.permissions?.canRespond && !event.permissions.canManage && (
            <div className="grid grid-cols-3 gap-2">
              {[
                AttendeeResponseStatus.ACCEPTED,
                AttendeeResponseStatus.TENTATIVE,
                AttendeeResponseStatus.DECLINED,
              ].map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => onRespond(status)}
                  disabled={busy}
                  className="cursor-pointer rounded-lg border border-slate-200 px-3 py-2 text-xs font-black text-slate-600 transition hover:border-[var(--color-secondary)] hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {intl.formatMessage({ id: `calendar.response.${status}` })}
                </button>
              ))}
            </div>
          )}

          {event.documentIds.length > 0 && (
            <div className="rounded-lg bg-slate-50 px-3 py-3 text-sm font-semibold text-slate-600">
              {intl.formatMessage(
                { id: "calendar.attachedDocuments" },
                { count: event.documentIds.length },
              )}
            </div>
          )}
        </div>

        <EventDetailActions
          event={event}
          busy={busy}
          onCancelEvent={onCancelEvent}
          onEdit={onEdit}
        />
      </div>
    </div>
  );
}
