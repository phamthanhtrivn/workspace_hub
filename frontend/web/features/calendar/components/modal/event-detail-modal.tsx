"use client";

import { Calendar, Clock, MapPin, Pencil, Trash2, User, X } from "lucide-react";
import { useState } from "react";
import Image from "next/image";
import { useAppIntl } from "@/features/i18n/useAppIntl";
import {
  AttendeeResponseStatus,
  CalendarEvent,
  EventSourceType,
  RecurrenceScope,
} from "../../types/calendar.types";
import { formatCalendarEventRange } from "../../utils/calendar-date.utils";

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
  const [cancelScope, setCancelScope] = useState(RecurrenceScope.THIS);

  if (!open || !event) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-xl overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-200 px-5 py-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span
                className="h-3 w-3 rounded-full"
                style={{ backgroundColor: event.color || event.calendar?.color || "#2563eb" }}
              />
              <h2 className="truncate text-xl font-black text-[var(--color-primary-dark)]">
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

          <div>
            <h3 className="text-xs font-black uppercase text-slate-400">
              {intl.formatMessage({ id: "calendar.attendees" })}
            </h3>
            <div className="mt-2 space-y-2">
              {event.attendees && event.attendees.length > 0 ? (
                event.attendees.map((attendee) => (
                  <div
                    key={attendee.userId}
                    className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2"
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <div className="grid h-8 w-8 place-items-center overflow-hidden rounded-full bg-slate-100">
                        {attendee.profile?.avatarUrl ? (
                          <Image
                            src={attendee.profile.avatarUrl}
                            alt={attendee.profile.fullName || attendee.userId}
                            width={32}
                            height={32}
                            unoptimized
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <User className="h-4 w-4 text-slate-400" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-slate-700">
                          {attendee.profile?.fullName ||
                            attendee.profile?.email ||
                            attendee.userId}
                        </p>
                        <p className="truncate text-xs font-semibold text-slate-400">
                          {attendee.profile?.email || attendee.userId}
                        </p>
                      </div>
                    </div>
                    <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-black text-slate-500">
                      {attendee.responseStatus || AttendeeResponseStatus.NEEDS_ACTION}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-sm font-semibold text-slate-400">
                  {intl.formatMessage({ id: "calendar.noAttendees" })}
                </p>
              )}
            </div>
          </div>

          {event.permissions?.canRespond && (
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

        {event.permissions?.canManage && (
        <div className="flex flex-wrap justify-between gap-2 border-t border-slate-200 px-5 py-4">
          {(event.recurrenceRule || event.recurrenceParentId) && (
            <select
              value={cancelScope}
              onChange={(changeEvent) =>
                setCancelScope(changeEvent.target.value as RecurrenceScope)
              }
              className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600"
            >
              {Object.values(RecurrenceScope).map((value) => (
                <option key={value} value={value}>
                  {intl.formatMessage({ id: `calendar.scope.${value}` })}
                </option>
              ))}
            </select>
          )}
          <button
            type="button"
            onClick={() => onCancelEvent(cancelScope)}
            disabled={busy}
            className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-red-200 px-4 py-2 text-sm font-bold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Trash2 className="h-4 w-4" />
            {intl.formatMessage({ id: "calendar.cancelEvent" })}
          </button>
          <button
            type="button"
            onClick={onEdit}
            className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-[var(--color-primary-dark)] px-4 py-2 text-sm font-bold text-white transition hover:bg-[var(--color-primary)]"
          >
            <Pencil className="h-4 w-4" />
            {intl.formatMessage({ id: "calendar.editEvent" })}
          </button>
        </div>
        )}
      </div>
    </div>
  );
}
