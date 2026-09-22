"use client";

import { MoreVertical, Trash2 } from "lucide-react";
import { FormEvent, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAppIntl } from "@/features/i18n/useAppIntl";
import { cn } from "@/lib/utils";
import { WorkspaceCalendar } from "../../types/calendar.types";
import {
  CalendarColorPicker,
  CalendarIconPicker,
} from "./calendar-style-fields";

interface CalendarEditValues {
  name: string;
  icon: string | null;
  color: string;
}

export function CalendarEditPopover({
  calendar,
  pending,
  canDelete = false,
  triggerClassName,
  onSave,
  onRequestDelete,
}: {
  calendar: WorkspaceCalendar;
  pending: boolean;
  canDelete?: boolean;
  triggerClassName?: string;
  onSave: (values: CalendarEditValues) => Promise<boolean>;
  onRequestDelete?: () => void;
}) {
  const intl = useAppIntl();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(calendar.name);
  const [icon, setIcon] = useState<string | null>(calendar.icon);
  const [color, setColor] = useState(calendar.color);
  const [showCustomColor, setShowCustomColor] = useState(false);

  useEffect(() => {
    if (!open) return;

    const closeOnOutsidePress = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("pointerdown", closeOnOutsidePress);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsidePress);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  const openEditor = () => {
    setName(calendar.name);
    setIcon(calendar.icon);
    setColor(calendar.color);
    setShowCustomColor(false);
    setOpen(true);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const saved = await onSave({ name: name.trim(), icon, color });
    if (saved) setOpen(false);
  };

  return (
    <div ref={rootRef} className="relative">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={() => (open ? setOpen(false) : openEditor())}
        className={cn(
          "grid h-6 w-6 cursor-pointer place-items-center rounded-md text-slate-400 transition hover:bg-slate-200/70 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40",
          triggerClassName,
          open && "!opacity-100 bg-slate-100 text-slate-700",
        )}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={intl.formatMessage({ id: "calendar.editCalendar" })}
      >
        <MoreVertical className="h-3.5 w-3.5" />
      </Button>

      {open && (
        <form
          role="dialog"
          aria-label={intl.formatMessage({ id: "calendar.editCalendar" })}
          onSubmit={handleSubmit}
          className="absolute right-0 top-[calc(100%+0.1rem)] z-30 w-56 space-y-3 rounded-lg border border-slate-200 bg-white p-3 shadow-[0_8px_24px_rgba(15,23,42,0.2)]"
        >
          <label className="block space-y-1">
            <span className="text-[11px] font-semibold text-slate-500">
              {intl.formatMessage({ id: "calendar.calendarName" })}
            </span>
            <Input
              autoFocus
              value={name}
              maxLength={120}
              disabled={pending}
              onChange={(event) => setName(event.target.value)}
              className="h-8 w-full rounded-md border border-slate-200 px-2.5 text-sm text-slate-700 shadow-none outline-none focus-visible:border-blue-500 focus-visible:ring-2 focus-visible:ring-blue-100 disabled:opacity-60"
            />
          </label>

          <div className="space-y-1.5">
            <p className="text-[11px] font-semibold text-slate-500">
              {intl.formatMessage({ id: "calendar.icon" })}
            </p>
            <CalendarIconPicker compact value={icon} onChange={setIcon} />
          </div>

          <div className="space-y-1.5">
            <p className="text-[11px] font-semibold text-slate-500">
              {intl.formatMessage({ id: "calendar.color" })}
            </p>
            <CalendarColorPicker
              compact
              value={color}
              showCustomColor={showCustomColor}
              onChange={setColor}
              onShowCustomColor={setShowCustomColor}
            />
          </div>

          <div className="flex items-center justify-between border-t border-slate-100 pt-3">
            {canDelete ? (
              <Button
                type="button"
                variant="ghost"
                disabled={pending}
                onClick={() => {
                  setOpen(false);
                  onRequestDelete?.();
                }}
                className="inline-flex cursor-pointer items-center gap-1 rounded p-1 text-xs font-semibold text-red-600 transition hover:bg-red-50 hover:text-red-700 disabled:opacity-60"
                title={intl.formatMessage({ id: "calendar.deleteCalendar" })}
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span className="text-[11px] font-bold">
                  {intl.formatMessage({ id: "calendar.deleteCalendar" })}
                </span>
              </Button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                disabled={pending}
                onClick={() => setOpen(false)}
                className="h-auto cursor-pointer px-2.5 py-1.5 text-xs font-semibold text-slate-500 hover:bg-transparent hover:text-slate-800 disabled:cursor-wait disabled:opacity-60"
              >
                {intl.formatMessage({ id: "app.cancel" })}
              </Button>
              <Button
                type="submit"
                disabled={pending}
                className="cursor-pointer rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:cursor-wait disabled:opacity-60"
              >
                {intl.formatMessage({
                  id: pending ? "app.saving" : "app.save",
                })}
              </Button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
