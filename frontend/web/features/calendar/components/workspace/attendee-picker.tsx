"use client";

import { Search, User, X } from "lucide-react";
import Image from "next/image";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CALENDAR_FORM_COPY as copy } from "../../constants/calendar-form-copy";
import { useAppSelector } from "@/store/store";
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
  const [query, setQuery] = useState("");
  const { data: results = [], isFetching: loading } = useAttendeeSearch(query);
  const currentUserId = useAppSelector((state) => state.auth.userId);
  const attendeeIds = useMemo(
    () =>
      new Set([
        ...attendees.map((attendee) => attendee.userId),
        ...(currentUserId ? [currentUserId] : []),
      ]),
    [attendees, currentUserId],
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
        <label className="text-xs font-semibold uppercase text-muted-foreground">
          {copy.attendees}
        </label>
      )}
      <div className="relative">
        {!compact && (
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        )}
        <Input
          value={query}
          aria-label={compact ? copy.addGuests : copy.searchAttendees}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={compact ? copy.addGuests : copy.searchAttendees}
          className={`h-auto w-full rounded-control py-2 pr-3 text-sm text-foreground shadow-none outline-none transition placeholder:text-muted-foreground ${
            compact
              ? "rounded-control border border-input bg-card px-3 font-medium hover:border-input focus:border-info-outline focus-visible:ring-2 focus-visible:ring-ring"
              : "border border-input pl-9 font-semibold focus-visible:border-primary-soft focus-visible:ring-4 focus-visible:ring-ring"
          }`}
        />
      </div>

      {query.trim() && (
        <div className="max-h-44 overflow-y-auto rounded-lg border border-border bg-card">
          {loading ? (
            <div className="px-3 py-3 text-xs font-semibold text-muted-foreground">
              {copy.searching}
            </div>
          ) : results.length === 0 ? (
            <div className="px-3 py-3 text-xs font-semibold text-muted-foreground">
              {copy.noResults}
            </div>
          ) : (
            results.map((user) => (
              <Button
                key={user.id}
                type="button"
                variant="ghost"
                onClick={() => addUser(user)}
                className="flex h-auto w-full cursor-pointer items-center justify-start gap-2 rounded-none px-3 py-2 text-left transition hover:bg-background disabled:cursor-not-allowed disabled:opacity-50"
                disabled={attendeeIds.has(user.id)}
              >
                <div className="grid h-8 w-8 place-items-center overflow-hidden rounded-full bg-muted">
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
                    <User className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">
                    {user.fullName || user.email}
                  </p>
                  <p className="truncate text-xs font-semibold text-muted-foreground">
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
                className="inline-flex max-w-full items-center gap-2 rounded-full border border-border bg-background px-2 py-1 text-xs font-semibold text-muted-foreground"
              >
                <div className="grid h-5 w-5 shrink-0 place-items-center overflow-hidden rounded-full bg-accent">
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
                    <User className="h-3 w-3 text-muted-foreground" />
                  )}
                </div>
                <span className="max-w-40 truncate">{displayName}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeUser(attendee.userId)}
                  className="h-5 w-5 cursor-pointer p-0 text-muted-foreground hover:bg-transparent hover:text-foreground"
                  aria-label={copy.delete}
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
