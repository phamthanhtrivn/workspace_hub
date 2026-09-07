import { MapPin, Target, Users } from "lucide-react";
import { useState } from "react";
import { UseFormRegister } from "react-hook-form";
import { useAppIntl } from "@/features/i18n/useAppIntl";
import { CalendarEventEditorValues } from "../../schemas/calendar-event-form.schema";
import { QuickRow } from "./quick-create-time-section";

export function QuickCreateAppointmentFields({
  register,
}: {
  register: UseFormRegister<CalendarEventEditorValues>;
}) {
  const intl = useAppIntl();
  const [duration, setDuration] = useState("30");

  return (
    <>
      <QuickRow icon={<Target className="h-5 w-5" />}>
        <label className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-slate-200/60">
          <span className="text-sm text-slate-600">
            {intl.formatMessage({ id: "calendar.quick.duration" })}
          </span>
          <select
            value={duration}
            aria-label={intl.formatMessage({ id: "calendar.quick.duration" })}
            onChange={(event) => setDuration(event.target.value)}
            className="cursor-pointer border-0 bg-transparent text-sm text-slate-700 outline-none"
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
        </label>
      </QuickRow>
      <QuickRow icon={<Users className="h-5 w-5" />}>
        <p className="rounded-lg px-2 py-2.5 text-sm text-slate-600">
          {intl.formatMessage({ id: "calendar.quick.bookingPage" })}
        </p>
      </QuickRow>
      <QuickRow icon={<MapPin className="h-5 w-5" />}>
        <input
          {...register("location")}
          aria-label={intl.formatMessage({ id: "calendar.location" })}
          placeholder={intl.formatMessage({ id: "calendar.quick.addLocation" })}
          className="w-full rounded-lg border-0 bg-transparent px-2 py-2.5 text-sm text-slate-700 outline-none transition placeholder:text-slate-600 hover:bg-slate-200/60 focus:bg-white"
        />
      </QuickRow>
    </>
  );
}
