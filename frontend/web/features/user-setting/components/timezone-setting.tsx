"use client";

import { useMemo } from "react";
import { FALLBACK_TIMEZONE, isValidTimezone } from "@/lib/timezone";
import { timezoneOptions } from "../utils/timezone-options";
import { TimezoneSelect } from "./ui/timezone-select";

export function TimezoneSetting({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (timezone: string) => void;
  disabled?: boolean;
}) {
  const options = useMemo(() => timezoneOptions(value), [value]);
  return (
    <div className="space-y-2">
      <TimezoneSelect
        value={isValidTimezone(value) ? value : FALLBACK_TIMEZONE}
        options={options}
        onChange={onChange}
        disabled={disabled}
      />
      <p className="text-sm text-muted-foreground">
        Dates, times and daily views across your workspace use this timezone.
        Vietnam (UTC+07:00) is the default. Save settings to apply your
        selection.
      </p>
    </div>
  );
}
