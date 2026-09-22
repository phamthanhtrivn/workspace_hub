"use client";

import { MapPin, Users, Video } from "lucide-react";
import { UseFormRegister } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAppIntl } from "@/features/i18n/useAppIntl";
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
        <Button
          type="button"
          variant="ghost"
          onClick={() =>
            toast.info(
              intl.formatMessage({ id: "calendar.quick.conferenceUiOnly" }),
            )
          }
          className="h-auto w-full cursor-pointer justify-start rounded-xl px-3 py-2 text-left text-sm font-medium text-slate-600 transition hover:bg-slate-100"
        >
          {intl.formatMessage({ id: "calendar.quick.addConference" })}
        </Button>
      </QuickRow>
      <QuickRow icon={<MapPin className="h-5 w-5" />}>
        <Input
          {...register("location")}
          aria-label={intl.formatMessage({ id: "calendar.location" })}
          placeholder={intl.formatMessage({ id: "calendar.quick.addLocation" })}
          className="h-auto w-full rounded-xl border border-transparent bg-transparent px-3 py-2.5 text-sm font-medium text-slate-700 shadow-none outline-none transition placeholder:text-slate-600 hover:bg-slate-100 focus:border-blue-500/50 focus:bg-white focus-visible:ring-1 focus-visible:ring-blue-100"
        />
      </QuickRow>
    </>
  );
}
