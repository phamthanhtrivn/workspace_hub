"use client";

import { useState } from "react";
import { MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CustomColorPicker } from "@/components/ui/custom/custom-color-picker";
import { CALENDAR_COLOR_CHOICES } from "../../types/calendar.constants";

export function CalendarColorPopover({ value, label, pending = false, triggerClassName, onChange }: {
  value: string; label: string; pending?: boolean; triggerClassName?: string;
  onChange: (color: string) => void | Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  return <Popover open={open} onOpenChange={setOpen}>
    <PopoverTrigger asChild><Button loading={pending} type="button" variant="ghost" size="icon-sm" aria-label={label} disabled={pending} className={triggerClassName}>
      <MoreVertical aria-hidden className="size-4" />
    </Button></PopoverTrigger>
    <PopoverContent align="end" className="max-w-[calc(100vw-1rem)] p-3" aria-label={label}>
      <CustomColorPicker key={value} value={value} options={CALENDAR_COLOR_CHOICES} ariaLabel={label} disabled={pending}
        onChange={(color) => { void Promise.resolve(onChange(color)).then(() => setOpen(false), () => {}); }} />
    </PopoverContent>
  </Popover>;
}
