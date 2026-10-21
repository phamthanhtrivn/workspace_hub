"use client";

import * as React from "react";
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker, getDefaultClassNames, useDayPicker, type DayButton, type DropdownProps } from "react-day-picker";
import { CustomSelect } from "./custom/custom-select";
import { setMonth, setYear } from "date-fns";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// shadcn Calendar composition, styled with the workspace's owned controls/tokens.
function Calendar({ className, classNames, components, showOutsideDays = true, ...props }: React.ComponentProps<typeof DayPicker>) {
  const defaults = getDefaultClassNames();
  return (
    <DayPicker showOutsideDays={showOutsideDays} weekStartsOn={1}
      className={cn("w-fit bg-popover p-2 text-popover-foreground [--cell-size:2.5rem]", className)}
      classNames={{
        root: defaults.root,
        months: "relative flex flex-col gap-4 sm:flex-row",
        month: "flex w-full flex-col gap-2",
        nav: "absolute inset-x-0 top-0 flex items-center justify-between",
        button_previous: cn(buttonVariants({ variant: "ghost", size: "icon" }), "size-[var(--cell-size)] min-h-0 min-w-0 p-0 aria-disabled:opacity-50"),
        button_next: cn(buttonVariants({ variant: "ghost", size: "icon" }), "size-[var(--cell-size)] min-h-0 min-w-0 p-0 aria-disabled:opacity-50"),
        month_caption: "flex h-[var(--cell-size)] items-center justify-center px-[var(--cell-size)]",
        caption_label: "text-sm font-semibold",
        dropdowns: "flex min-w-0 items-center gap-1",
        month_grid: "w-full border-collapse",
        weekdays: "grid grid-cols-7",
        weekday: "py-1 text-center text-xs font-normal text-muted-foreground",
        week: "mt-1 grid grid-cols-7",
        day: "group/day relative size-[var(--cell-size)] p-0 text-center",
        today: "rounded-control bg-muted font-semibold",
        outside: "text-muted-foreground opacity-60",
        disabled: "text-muted-foreground opacity-40",
        hidden: "invisible",
        range_start: "rounded-l-control bg-primary-soft",
        range_end: "rounded-r-control bg-primary-soft",
        range_middle: "bg-muted",
        ...classNames,
      }}
      components={{
        Root: ({ rootRef, ...rootProps }) => <div data-slot="calendar" ref={rootRef} {...rootProps} />,
        Chevron: ({ orientation, className: chevronClassName, ...chevronProps }) => {
          const Icon = orientation === "left" ? ChevronLeft : orientation === "right" ? ChevronRight : ChevronDown;
          return <Icon aria-hidden className={cn("size-4", chevronClassName)} {...chevronProps} />;
        },
        DayButton: CalendarDayButton,
        MonthsDropdown: (dropdownProps) => <CalendarDropdown {...dropdownProps} kind="month" />,
        YearsDropdown: (dropdownProps) => <CalendarDropdown {...dropdownProps} kind="year" />,
        ...components,
      }}
      {...props} />
  );
}

function CalendarDropdown({ kind, options = [], value, disabled, "aria-label": ariaLabel }: DropdownProps & { kind: "month" | "year" }) {
  const { months, goToMonth } = useDayPicker();
  return <CustomSelect
    value={String(value ?? "")}
    disabled={disabled}
    ariaLabel={ariaLabel ?? (kind === "month" ? "Month" : "Year")}
    options={options.map((option) => ({ ...option, value: String(option.value) }))}
    triggerClassName="h-8 w-auto min-w-20 border-0 px-2 text-xs"
    onChange={(next) => goToMonth(kind === "month" ? setMonth(months[0].date, Number(next)) : setYear(months[0].date, Number(next)))}
  />;
}

function CalendarDayButton({ className, day, modifiers, ...props }: React.ComponentProps<typeof DayButton>) {
  const ref = React.useRef<HTMLButtonElement>(null);
  React.useEffect(() => {
    if (modifiers.focused) ref.current?.focus();
  }, [modifiers.focused]);
  return (
    <Button ref={ref} variant="ghost" size="icon" data-day={day.date.toLocaleDateString()}
      data-selected={modifiers.selected || undefined}
      className={cn("size-[var(--cell-size)] min-h-0 min-w-0 rounded-control p-0 text-sm font-normal tabular-nums data-[selected=true]:bg-primary-soft data-[selected=true]:text-primary-soft-foreground data-[selected=true]:hover:bg-primary-soft motion-reduce:transition-none", className)}
      {...props} />
  );
}

export { Calendar, CalendarDayButton };
