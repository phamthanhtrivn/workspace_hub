import Image from "next/image";
import { User } from "lucide-react";
import { useAppIntl } from "@/features/i18n/useAppIntl";
import {
  AttendeeResponseStatus,
  CalendarEventAttendee,
  UserProfileSnapshot,
} from "../../types/calendar.types";

interface EventAttendeeListProps {
  attendees: CalendarEventAttendee[];
  resolvedProfiles: Record<string, UserProfileSnapshot>;
}

export function EventAttendeeList({
  attendees,
  resolvedProfiles,
}: EventAttendeeListProps) {
  const intl = useAppIntl();

  if (attendees.length === 0) return null;

  return (
    <div>
      <h3 className="text-xs font-black uppercase text-slate-400">
        {intl.formatMessage({ id: "calendar.attendees" })}
      </h3>
      <div className="mt-2 space-y-2">
        {attendees.map((attendee) => {
          const profile = attendee.profile?.fullName
            ? attendee.profile
            : resolvedProfiles[attendee.userId] || attendee.profile;
          const displayName =
            profile?.fullName ||
            profile?.email ||
            intl.formatMessage({ id: "app.user" });

          return (
            <div
              key={attendee.userId}
              className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2"
            >
              <div className="flex min-w-0 items-center gap-2">
                <div className="grid h-8 w-8 place-items-center overflow-hidden rounded-full bg-slate-100">
                  {profile?.avatarUrl ? (
                    <Image
                      src={profile.avatarUrl}
                      alt={displayName}
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
                    {displayName}
                  </p>
                  {profile?.email && profile.email !== displayName && (
                    <p className="truncate text-xs font-semibold text-slate-400">
                      {profile.email}
                    </p>
                  )}
                </div>
              </div>
              <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-black text-slate-500">
                {attendee.responseStatus || AttendeeResponseStatus.NEEDS_ACTION}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
