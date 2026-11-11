"use client";

import type { ReactNode } from "react";
import { AlignLeft, Bell, Calendar, CheckCircle2, Circle, ExternalLink, ListTodo, MapPin, Paperclip, Target, Users } from "lucide-react";
import { useAppSelector } from "@/store/store";
import type { CalendarEvent } from "../../types/calendar.types";
import { formatReminderLabel } from "../../utils/calendar-date.utils";
import { isTaskCalendarEvent } from "../../utils/calendar-event.utils";
import { formatTaskDeadline } from "../../utils/calendar-task-deadline.utils";
import { CALENDAR_FORM_COPY as copy } from "../../constants/calendar-form-copy";
import { useAttendeeProfiles } from "../../hooks/use-calendar-users";
import { CalendarDocumentsSection } from "./calendar-documents-section";
import { EventAttendeeList } from "./event-attendee-list";

export function CalendarEventReadonlyDetails({ event, children }: { event: CalendarEvent; children?: ReactNode }) {
  const currentUserId = useAppSelector(state => state.auth.userId);
  const profiles = useAttendeeProfiles(event, true);
  const isTask = isTaskCalendarEvent(event);
  const description = event.description?.trim();
  const deadlineLabel = isTask ? formatTaskDeadline(event) : null;
  const guests = event.attendees?.filter(attendee => attendee.userId !== event.createdBy) ?? [];
  const reminders = event.reminders?.length ? event.reminders.map(reminder => formatReminderLabel(reminder.minutesBefore)).join(", ") : "No reminders";
  const calendarName = event.calendar?.name || event.creatorProfile?.fullName || event.creatorProfile?.email || "My Calendar";
  const physicalLocation = event.location && !event.location.includes("meet.google.com");
  const StatusIcon = event.completedAt ? CheckCircle2 : Circle;
  return <div className="space-y-4">
    {deadlineLabel && <div className="flex items-start gap-4">
      <Target aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0 text-sm"><p className="text-xs text-muted-foreground">{copy.deadline}</p><p className="text-foreground">{deadlineLabel}</p></div>
    </div>}
    {isTask && <div className="flex items-start gap-4"><StatusIcon aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-muted-foreground" /><p className="text-sm text-foreground">{event.completedAt ? "Completed" : "To do"}</p></div>}
    <div className="flex items-start gap-4">
      <Bell aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-muted-foreground" /><p className="min-w-0 text-sm text-foreground">{reminders}</p>
    </div>
    <div className="flex items-start gap-4">
      {isTask ? <ListTodo aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-info-content" /> : <Calendar aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-muted-foreground" />}
      <p className="min-w-0 text-sm text-foreground">{isTask ? "Tasks" : calendarName}</p>
    </div>
    {children}
    {physicalLocation && <div className="flex items-start gap-4">
      <MapPin aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
      <a href={"https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(event.location!)} target="_blank" rel="noreferrer"
        className="flex min-w-0 items-start gap-1.5 text-sm text-foreground underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <span className="break-words">{event.location}</span><ExternalLink aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
      </a>
    </div>}
    {description && <div className="flex items-start gap-4">
      <AlignLeft aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-muted-foreground" /><p className="min-w-0 whitespace-pre-wrap break-words text-sm leading-relaxed text-foreground">{description}</p>
    </div>}
    {guests.length > 0 && <div className="flex items-start gap-4">
      <Users aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-muted-foreground" /><div className="min-w-0 flex-1"><EventAttendeeList attendees={guests} resolvedProfiles={profiles} currentUserId={currentUserId} /></div>
    </div>}
    {event.documentIds.length > 0 && <div className="flex items-start gap-4">
      <Paperclip aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-muted-foreground" /><div className="min-w-0 flex-1"><CalendarDocumentsSection documentIds={event.documentIds} isReadOnly hideHeader /></div>
    </div>}
  </div>;
}
