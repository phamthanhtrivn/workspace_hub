import { MapPin, Users, Video } from "lucide-react";
import { UseFormRegister } from "react-hook-form";
import { useAppIntl } from "@/features/i18n/useAppIntl";
import { CalendarEventEditorValues } from "../../schemas/calendar-event-form.schema";
import { CalendarEventAttendeePayload } from "../../types/calendar.types";
import { AttendeePicker } from "../workspace/attendee-picker";
import { QuickRow } from "./quick-create-time-section";

interface QuickCreateEventFieldsProps {
  attendees: CalendarEventAttendeePayload[];
  onAttendeesChange: (attendees: CalendarEventAttendeePayload[]) => void;
  onUnavailableConference: () => void;
  register: UseFormRegister<CalendarEventEditorValues>;
}

export function QuickCreateEventFields({
  attendees,
  onAttendeesChange,
  onUnavailableConference,
  register,
}: QuickCreateEventFieldsProps) {
  const intl = useAppIntl();

  return (
    <>
      <QuickRow icon={<Users className="h-5 w-5" />}>
        <AttendeePicker
          compact
          attendees={attendees}
          onChange={onAttendeesChange}
        />
      </QuickRow>
      <QuickRow icon={<Video className="h-5 w-5" />}>
        <button
          type="button"
          onClick={onUnavailableConference}
          className="w-full cursor-pointer rounded-lg px-2 py-2.5 text-left text-sm text-slate-600 transition hover:bg-slate-200/60"
        >
          {intl.formatMessage({ id: "calendar.quick.addConference" })}
        </button>
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
