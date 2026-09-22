"use client";

import { Search, User, X } from "lucide-react";
import Image from "next/image";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAppIntl } from "@/features/i18n/useAppIntl";
import { UserSearchResponse } from "@/features/chat/types/chat.types";
import { useAttendeeSearch } from "../../hooks/use-calendar-users";
import { CalendarEventAttendeePayload } from "../../types/calendar.types";

export function AttendeePicker({
  attendees,
  onChange,
  compact = false,
}: {
  attendees: CalendarEventAttendeePayload[];
  onChange: (attendees: CalendarEventAttendeePayload[]) => void;
  compact?: boolean;
}) {
  const intl = useAppIntl();
  const [query, setQuery] = useState("");
  const { data: results = [], isFetching: loading } = useAttendeeSearch(query);
  const attendeeIds = useMemo(
    () => new Set(attendees.map((attendee) => attendee.userId)),
    [attendees],
  );

  const addUser = (user: UserSearchResponse) => {
    if (attendeeIds.has(user.id)) return;
    onChange([
      ...attendees,
      {
        userId: user.id,
        optional: false,
        profile: {
          fullName: user.fullName || null,
          email: user.email,
          avatarUrl: user.avatarUrl || null,
        },
      },
    ]);
    setQuery("");
  };

  const removeUser = (userId: string) => {
    onChange(attendees.filter((attendee) => attendee.userId !== userId));
  };

  return (
    <div className="space-y-2">
      {!compact && (
        <label className="text-xs font-black uppercase text-slate-400">
          {intl.formatMessage({ id: "calendar.attendees" })}
        </label>
      )}
      <div className="relative">
        {!compact && (
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
        )}
        <Input
          value={query}
          aria-label={intl.formatMessage({
            id: compact
              ? "calendar.quick.addGuests"
              : "calendar.searchAttendees",
          })}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={intl.formatMessage({
            id: compact
              ? "calendar.quick.addGuests"
              : "calendar.searchAttendees",
          })}
          className={`h-auto w-full rounded-lg py-2 pr-3 text-sm text-slate-700 shadow-none outline-none transition placeholder:text-slate-500 ${
            compact
              ? "rounded-xl border border-transparent bg-transparent pl-3 font-medium hover:bg-slate-100 focus:border-blue-500/50 focus:bg-white focus-visible:ring-1 focus-visible:ring-blue-100"
              : "border border-slate-200 pl-9 font-semibold focus-visible:border-[var(--color-secondary)] focus-visible:ring-4 focus-visible:ring-blue-100"
          }`}
        />
      </div>

      {query.trim() && (
        <div className="max-h-44 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-sm">
          {loading ? (
            <div className="px-3 py-3 text-xs font-semibold text-slate-400">
              {intl.formatMessage({ id: "chat.searching" })}
            </div>
          ) : results.length === 0 ? (
            <div className="px-3 py-3 text-xs font-semibold text-slate-400">
              {intl.formatMessage({ id: "chat.noResults" })}
            </div>
          ) : (
            results.map((user) => (
              <Button
                key={user.id}
                type="button"
                variant="ghost"
                onClick={() => addUser(user)}
                className="flex h-auto w-full cursor-pointer items-center justify-start gap-2 rounded-none px-3 py-2 text-left transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={attendeeIds.has(user.id)}
              >
                <div className="grid h-8 w-8 place-items-center overflow-hidden rounded-full bg-slate-100">
                  {user.avatarUrl ? (
                    <Image
                      src={user.avatarUrl}
                      alt={user.fullName || user.email}
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
                    {user.fullName || user.email}
                  </p>
                  <p className="truncate text-xs font-semibold text-slate-400">
                    {user.email}
                  </p>
                </div>
              </Button>
            ))
          )}
        </div>
      )}

      {attendees.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {attendees.map((attendee) => {
            const displayName =
              attendee.profile?.fullName ||
              attendee.profile?.email ||
              attendee.userId;
            const avatarUrl = attendee.profile?.avatarUrl;
            return (
              <span
                key={attendee.userId}
                className="inline-flex max-w-full items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-bold text-slate-600"
              >
                <div className="grid h-5 w-5 shrink-0 place-items-center overflow-hidden rounded-full bg-slate-200">
                  {avatarUrl ? (
                    <Image
                      src={avatarUrl}
                      alt={displayName}
                      width={20}
                      height={20}
                      unoptimized
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <User className="h-3 w-3 text-slate-400" />
                  )}
                </div>
                <span className="max-w-40 truncate">{displayName}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeUser(attendee.userId)}
                  className="h-5 w-5 cursor-pointer p-0 text-slate-400 hover:bg-transparent hover:text-slate-700"
                  aria-label={intl.formatMessage({ id: "app.delete" })}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}
