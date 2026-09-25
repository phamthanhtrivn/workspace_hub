"use client";

import { MapPin, Users, Video } from "lucide-react";
import { UseFormRegister } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CALENDAR_FORM_COPY as copy } from "../../constants/calendar-form-copy";
import { CalendarEventEditorValues } from "../../schemas/calendar-event-form.schema";
import { CalendarEventAttendeePayload } from "../../types/calendar.types";
import { AttendeePicker } from "../workspace/attendee-picker";
import { QuickRow } from "./quick-create-time-section";

interface QuickCreateEventFieldsProps {
  attendees: CalendarEventAttendeePayload[];
  onAttendeesChange: (attendees: CalendarEventAttendeePayload[]) => void;
  register: UseFormRegister<CalendarEventEditorValues>;
}

export function QuickCreateEventFields({
  attendees,
  onAttendeesChange,
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
        <Button
          type="button"
          variant="ghost"
          onClick={() => toast.info(copy.conferenceUnavailable)}
          className="h-auto w-full cursor-pointer justify-start rounded-xl border border-slate-200 bg-white px-3 py-2 text-left text-sm font-medium text-slate-700 shadow-2xs transition hover:border-slate-300 hover:bg-slate-50"
        >
          {copy.addConference}
        </Button>
      </QuickRow>
      <QuickRow icon={<MapPin className="h-5 w-5" />}>
        <Input
          {...register("location")}
          aria-label={copy.location}
          placeholder={copy.addLocation}
          className="h-auto w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-2xs outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus-visible:border-blue-500 focus-visible:ring-2 focus-visible:ring-blue-100"
        />
      </QuickRow>
    </>
  );
}
