import { Clock, MapPin } from "lucide-react";
import { useState } from "react";
import { UseFormRegister } from "react-hook-form";
import { useAppIntl } from "@/features/i18n/useAppIntl";
import { CalendarEventEditorValues } from "../../schemas/calendar-event-form.schema";

export function QuickCreateAppointmentFields({
  register,
}: {
  register: UseFormRegister<CalendarEventEditorValues>;
}) {
  const intl = useAppIntl();
  const [duration, setDuration] = useState("30");

  return (
    <div className="space-y-3.5">
      <div className="space-y-1.5">
        <label className="text-xs font-medium uppercase tracking-wider text-slate-500">
          {intl.formatMessage({ id: "calendar.quick.duration" })}
        </label>
        <div className="relative">
          <Clock className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <select
            value={duration}
            aria-label={intl.formatMessage({ id: "calendar.quick.duration" })}
            onChange={(event) => setDuration(event.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-white pl-10 pr-3.5 py-2 text-sm text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          >
            {[15, 30, 45, 60].map((minutes) => (
              <option key={minutes} value={minutes}>
                {intl.formatMessage(
                  { id: "calendar.quick.minutes" },
                  { minutes },
                )}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-medium uppercase tracking-wider text-slate-500">
          {intl.formatMessage({ id: "calendar.location" })}
        </label>
        <div className="relative">
          <MapPin className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            {...register("location")}
            aria-label={intl.formatMessage({ id: "calendar.location" })}
            placeholder={intl.formatMessage({
              id: "calendar.quick.addLocation",
            })}
            className="w-full rounded-lg border border-slate-200 bg-white pl-10 pr-3.5 py-2 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        </div>
      </div>
    </div>
  );
}
