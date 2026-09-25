"use client";

import { Check, Copy, Video, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { isWorkspaceMeetingUrl } from "../../utils/calendar-conference.utils";

interface CalendarConferenceCardProps {
  hasConference: boolean;
  locationValue?: string;
  onToggleConference: (enabled: boolean) => void;
  disabled?: boolean;
  isPastEvent?: boolean;
}

export function CalendarConferenceCard({
  hasConference,
  locationValue = "",
  onToggleConference,
  disabled = false,
  isPastEvent = false,
}: CalendarConferenceCardProps) {
  const [copied, setCopied] = useState(false);
  const isMeetingUrl = isWorkspaceMeetingUrl(locationValue);

  const handleCopyLink = () => {
    if (!locationValue) return;
    navigator.clipboard.writeText(locationValue);
    setCopied(true);
    toast.success("Meeting link copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAddConferenceClick = () => {
    if (isPastEvent) {
      toast.error("Cannot add video conference to past events");
      return;
    }
    onToggleConference(true);
  };

  if (!hasConference && !isMeetingUrl) {
    return (
      <Button
        type="button"
        variant="ghost"
        disabled={disabled}
        onClick={handleAddConferenceClick}
        className="h-auto w-full cursor-pointer justify-start rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-left text-sm font-medium text-slate-700 shadow-2xs transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
        title={
          isPastEvent ? "Cannot add video conference to past events" : undefined
        }
      >
        <Video
          className={`mr-2 h-4 w-4 ${
            isPastEvent ? "text-slate-400" : "text-blue-600"
          }`}
        />
        <span className={isPastEvent ? "text-slate-400" : ""}>
          Add Workspace Hub Video Conference
        </span>
      </Button>
    );
  }

  return (
    <div className="flex w-full items-center justify-between rounded-xl border border-blue-200/90 bg-blue-50/80 px-3.5 py-2.5 shadow-2xs transition">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-blue-600 text-white shadow-xs">
          <Video className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-bold text-slate-800">
            Workspace Hub Video Meeting
          </p>
          <p className="truncate text-[11px] font-medium text-slate-500">
            {isMeetingUrl
              ? locationValue
              : "Meeting link will be generated automatically upon saving"}
          </p>
        </div>
      </div>

      <div className="ml-2 flex items-center gap-1 shrink-0">
        {isMeetingUrl && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={handleCopyLink}
            className="h-7 w-7 cursor-pointer rounded-lg text-slate-600 transition hover:bg-blue-100 hover:text-blue-700"
            title="Copy meeting link"
            aria-label="Copy meeting link"
          >
            {copied ? (
              <Check className="h-3.5 w-3.5 text-emerald-600" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
          </Button>
        )}

        <Button
          type="button"
          variant="ghost"
          size="icon"
          disabled={disabled}
          onClick={() => onToggleConference(false)}
          className="h-7 w-7 cursor-pointer rounded-lg text-slate-500 transition hover:bg-red-100 hover:text-red-700 disabled:cursor-not-allowed"
          title="Remove video conference"
          aria-label="Remove video conference"
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
