"use client";

import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Menu,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { CustomSelect } from "@/components/ui/custom/custom-select";

import { CALENDAR_VIEW_OPTIONS } from "../../types/calendar.constants";

export function CalendarToolbar({
  title,
  activeView,
  onViewChange,
  onNavigate,
  onToggleSidebar,
}: {
  title: string;
  activeView: string;
  onViewChange: (view: string) => void;
  onNavigate: (direction: "prev" | "next" | "today") => void;
  onToggleSidebar: () => void;
}) {


  return (
    <div className="flex min-h-14 items-center justify-between gap-3 border-b border-border bg-card px-3 py-2 sm:px-5">
      <div className="flex min-w-0 items-center gap-1 sm:gap-2">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onToggleSidebar}
          className="grid h-9 w-9 cursor-pointer place-items-center rounded-control text-muted-foreground transition hover:bg-muted hover:text-foreground"
          aria-label="My Calendars"
          title="My Calendars"
        >
          <Menu className="h-5 w-5" />
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => onNavigate("today")}
          className="hidden cursor-pointer rounded-control border border-border bg-card px-3.5 py-1.5 text-xs font-semibold text-foreground transition hover:border-input hover:bg-background sm:block"
        >
          Today
        </Button>
        <div className="flex items-center gap-0.5">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => onNavigate("prev")}
            className="grid h-8 w-8 cursor-pointer place-items-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground"
            aria-label="Previous"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => onNavigate("next")}
            className="grid h-8 w-8 cursor-pointer place-items-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground"
            aria-label="Next"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <h2 className="truncate px-2 text-section-title font-semibold capitalize tracking-tight text-foreground sm:text-section-title">
          {title || "Calendar"}
        </h2>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <CalendarDays className="hidden h-4 w-4 text-muted-foreground sm:block" />
        <CustomSelect
          value={activeView}
          onChange={onViewChange}
          ariaLabel="Calendar view"
          options={CALENDAR_VIEW_OPTIONS.map((view) => ({
            value: view.value,
            label: view.label,
          }))}
          triggerClassName="h-9 cursor-pointer rounded-lg border-input bg-card pl-3 pr-8 text-xs font-semibold text-foreground transition hover:border-input hover:bg-background focus:border-primary focus:ring-2 focus:ring-ring"
          contentClassName="rounded-lg border-border"
        />
      </div>
    </div>
  );
}
