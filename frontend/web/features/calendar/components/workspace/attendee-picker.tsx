"use client";

import { Search, User, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useAppIntl } from "@/features/i18n/useAppIntl";
import { searchUserByEmail } from "@/features/chat/api/chat.api";
import { UserSearchResponse } from "@/features/chat/types/chat.types";
import { CalendarEventAttendeePayload } from "../../types/calendar.types";

export function AttendeePicker({
  attendees,
  onChange,
}: {
  attendees: CalendarEventAttendeePayload[];
  onChange: (attendees: CalendarEventAttendeePayload[]) => void;
}) {
  const intl = useAppIntl();
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<UserSearchResponse[]>([]);
  const attendeeIds = useMemo(
    () => new Set(attendees.map((attendee) => attendee.userId)),
    [attendees],
  );

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const timeout = window.setTimeout(async () => {
      setLoading(true);
      try {
        const response = await searchUserByEmail(query.trim());
        setResults(response.success ? response.data : []);
      } catch (error) {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 350);

    return () => window.clearTimeout(timeout);
  }, [query]);

  const addUser = (user: UserSearchResponse) => {
    if (attendeeIds.has(user.id)) return;
    onChange([...attendees, { userId: user.id, optional: false }]);
    setQuery("");
    setResults([]);
  };

  const removeUser = (userId: string) => {
    onChange(attendees.filter((attendee) => attendee.userId !== userId));
  };

  return (
    <div className="space-y-2">
      <label className="text-xs font-black uppercase text-slate-400">
        {intl.formatMessage({ id: "calendar.attendees" })}
      </label>
      <div className="relative">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={intl.formatMessage({ id: "calendar.searchAttendees" })}
          className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm font-semibold text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-[var(--color-secondary)] focus:ring-4 focus:ring-blue-100"
        />
      </div>

      {query && (
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
              <button
                key={user.id}
                type="button"
                onClick={() => addUser(user)}
                className="flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={attendeeIds.has(user.id)}
              >
                <div className="grid h-8 w-8 place-items-center overflow-hidden rounded-full bg-slate-100">
                  {user.avatarUrl ? (
                    <img
                      src={user.avatarUrl}
                      alt={user.fullName || user.email}
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
              </button>
            ))
          )}
        </div>
      )}

      {attendees.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {attendees.map((attendee) => (
            <span
              key={attendee.userId}
              className="inline-flex max-w-full items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-600"
            >
              <span className="max-w-40 truncate">{attendee.userId}</span>
              <button
                type="button"
                onClick={() => removeUser(attendee.userId)}
                className="cursor-pointer text-slate-400 hover:text-slate-700"
                aria-label={intl.formatMessage({ id: "app.delete" })}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
