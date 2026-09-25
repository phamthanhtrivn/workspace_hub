"use client";

import { MapPin, Users, Video } from "lucide-react";
import { UseFormRegister } from "react-hook-form";
import { CALENDAR_FORM_COPY as copy } from "../../constants/calendar-form-copy";
import { CalendarEventEditorValues } from "../../schemas/calendar-event-form.schema";
import { CalendarEventAttendeePayload } from "../../types/calendar.types";
import { AttendeePicker } from "../workspace/attendee-picker";
import { CalendarConferenceCard } from "./calendar-conference-card";
import { LocationPickerInput } from "./location-picker-input";
import { QuickRow } from "./quick-create-time-section";

interface QuickCreateEventFieldsProps {
  attendees: CalendarEventAttendeePayload[];
  onAttendeesChange: (attendees: CalendarEventAttendeePayload[]) => void;
  locationValue?: string;
  onLocationChange?: (val: string) => void;
  hasConference?: boolean;
  onToggleConference?: (enabled: boolean) => void;
  isPastEvent?: boolean;
  register: UseFormRegister<CalendarEventEditorValues>;
}

export function QuickCreateEventFields({
  attendees,
  onAttendeesChange,
  locationValue = "",
  onLocationChange,
  hasConference = false,
  onToggleConference,
  isPastEvent = false,
  register,
}: QuickCreateEventFieldsProps) {
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
        <CalendarConferenceCard
          hasConference={hasConference}
          locationValue={locationValue}
          onToggleConference={(enabled) => onToggleConference?.(enabled)}
          isPastEvent={isPastEvent}
        />
      </QuickRow>

      <QuickRow icon={<MapPin className="h-5 w-5" />}>
        <LocationPickerInput
          value={locationValue}
          onChange={(val) => {
            onLocationChange?.(val);
            register("location").onChange({
              target: { name: "location", value: val },
            });
          }}
          placeholder={copy.addLocation}
          ariaLabel={copy.location}
        />
      </QuickRow>
    </>
  );
}
