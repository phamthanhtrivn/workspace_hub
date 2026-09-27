import Image from "next/image";
import { User } from "lucide-react";
import {
  AttendeeResponseStatus,
  CalendarEventAttendee,
  UserProfileSnapshot,
} from "../../types/calendar.types";

interface EventAttendeeListProps {
  attendees: CalendarEventAttendee[];
  resolvedProfiles: Record<string, UserProfileSnapshot>;
  currentUserId?: string | null;
}

const responseStatusLabels: Record<AttendeeResponseStatus, string> = {
  [AttendeeResponseStatus.ACCEPTED]: "Accepted",
  [AttendeeResponseStatus.TENTATIVE]: "Tentative",
  [AttendeeResponseStatus.DECLINED]: "Declined",
  [AttendeeResponseStatus.NEEDS_ACTION]: "Awaiting response",
};

export function EventAttendeeList({
  attendees,
  resolvedProfiles,
  currentUserId,
}: EventAttendeeListProps) {
  if (attendees.length === 0) return null;

  return (
    <div>
      <h3 className="text-xs font-black uppercase text-slate-400">
        Attendees
      </h3>
      <div className="mt-2 space-y-2">
        {attendees.map((attendee) => {
          const profile = attendee.profile?.fullName
            ? attendee.profile
            : resolvedProfiles[attendee.userId] || attendee.profile;
          const displayName = profile?.fullName || profile?.email || "User";

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
                    {currentUserId && attendee.userId === currentUserId && (
                      <span className="ml-1.5 text-xs font-normal text-slate-400">
                        (You)
                      </span>
                    )}
                  </p>
                  {profile?.email && profile.email !== displayName && (
                    <p className="truncate text-xs font-semibold text-slate-400">
                      {profile.email}
                    </p>
                  )}
                </div>
              </div>
              {(() => {
                const status =
                  attendee.responseStatus ||
                  AttendeeResponseStatus.NEEDS_ACTION;
                const statusStyles: Record<AttendeeResponseStatus, string> = {
                  [AttendeeResponseStatus.ACCEPTED]:
                    "bg-emerald-50 text-emerald-700 border-emerald-200",
                  [AttendeeResponseStatus.TENTATIVE]:
                    "bg-amber-50 text-amber-700 border-amber-200",
                  [AttendeeResponseStatus.DECLINED]:
                    "bg-rose-50 text-rose-700 border-rose-200",
                  [AttendeeResponseStatus.NEEDS_ACTION]:
                    "bg-slate-100 text-slate-500 border-slate-200",
                };
                return (
                  <span
                    className={`rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${
                      statusStyles[status] ||
                      statusStyles[AttendeeResponseStatus.NEEDS_ACTION]
                    }`}
                  >
                    {responseStatusLabels[status] || "Awaiting response"}
                  </span>
                );
              })()}
            </div>
          );
        })}
      </div>
    </div>
  );
}
