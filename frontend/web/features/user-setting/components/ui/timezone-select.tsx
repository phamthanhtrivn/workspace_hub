"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FIELD_FOCUS_CONTAINER_CLASS_NAME } from "@/components/ui/field-focus";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
  filterTimezoneOptions,
  type TimezoneOption,
} from "../../utils/timezone-options";

export function TimezoneSelect({
  value,
  options,
  onChange,
  disabled,
}: {
  value: string;
  options: TimezoneOption[];
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  const id = useId();
  const searchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [activeValue, setActiveValue] = useState(value);
  const filtered = useMemo(
    () => filterTimezoneOptions(options, search),
    [options, search],
  );
  const activeIndex = Math.max(
    0,
    filtered.findIndex((option) => option.value === activeValue),
  );
  const selected = options.find((option) => option.value === value);
  useEffect(() => {
    if (open)
      listRef.current
        ?.querySelector('[data-active="true"]')
        ?.scrollIntoView({ block: "nearest" });
  }, [open, activeIndex, search]);
  const select = (timezone: string) => {
    onChange(timezone);
    setOpen(false);
  };
  return (
    <div className="space-y-1">
      <label
        id={`${id}-label`}
        htmlFor={`${id}-trigger`}
        className="text-sm font-semibold text-foreground"
      >
        Timezone
      </label>
      <Popover
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          setSearch("");
          setActiveValue(value);
        }}
      >
        <PopoverTrigger asChild>
          <Button
            id={`${id}-trigger`}
            type="button"
            variant="outline"
            disabled={disabled}
            aria-labelledby={`${id}-label ${id}-value`}
            aria-expanded={open}
            className="h-10 w-full justify-between rounded-control border-input bg-background px-4 text-sm font-semibold text-foreground"
          >
            <span id={`${id}-value`} className="truncate">
              {selected?.label || value}
            </span>
            <ChevronDown
              aria-hidden="true"
              className="size-4 shrink-0 text-muted-foreground"
            />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className="w-[var(--radix-popover-trigger-width)] max-w-[calc(100vw-2rem)] overflow-hidden"
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            searchRef.current?.focus();
          }}
        >
          <div className="border-b border-border p-2">
            <div
              className={cn(
                FIELD_FOCUS_CONTAINER_CLASS_NAME,
                "flex h-10 items-center gap-2.5 rounded-control border border-input bg-background px-3 transition-colors",
              )}
            >
              <Search
                aria-hidden="true"
                className="pointer-events-none size-4 shrink-0 text-muted-foreground"
              />
              <Input
                ref={searchRef}
                unstyled
                focusMode="container"
                role="combobox"
                aria-label="Search timezones"
                aria-autocomplete="list"
                aria-expanded={open}
                aria-controls={`${id}-list`}
                aria-activedescendant={
                  filtered.length ? `${id}-option-${activeIndex}` : undefined
                }
                value={search}
                placeholder="Search city, region or UTC offset…"
                className="h-full min-w-0 flex-1 border-0 bg-transparent p-0 text-sm font-normal placeholder:text-muted-foreground"
                onChange={(event) => {
                  setSearch(event.target.value);
                  setActiveValue("");
                }}
                onKeyDown={(event) => {
                  if (
                    !["ArrowDown", "ArrowUp", "Home", "End", "Enter"].includes(
                      event.key,
                    )
                  )
                    return;
                  event.preventDefault();
                  event.stopPropagation();
                  if (!filtered.length) return;
                  if (event.key === "Enter") {
                    select(filtered[activeIndex].value);
                    return;
                  }
                  const index =
                    event.key === "Home"
                      ? 0
                      : event.key === "End"
                        ? filtered.length - 1
                        : (activeIndex +
                            (event.key === "ArrowDown" ? 1 : -1) +
                            filtered.length) %
                          filtered.length;
                  setActiveValue(filtered[index].value);
                }}
              />
            </div>
          </div>
          <div
            ref={listRef}
            id={`${id}-list`}
            role="listbox"
            aria-label="Timezones"
            className="max-h-64 overflow-y-auto overscroll-contain p-1"
          >
            {filtered.map((option, index) => (
              <Button
                key={option.value}
                id={`${id}-option-${index}`}
                type="button"
                variant="ghost"
                role="option"
                tabIndex={-1}
                aria-selected={value === option.value}
                data-active={index === activeIndex}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => select(option.value)}
                onPointerMove={() => setActiveValue(option.value)}
                className={cn(
                  "h-auto min-h-9 w-full justify-between gap-3 rounded-control px-2.5 py-2 text-left text-sm font-normal whitespace-normal",
                  value === option.value && "bg-muted font-medium",
                  index === activeIndex && "bg-accent text-accent-foreground",
                )}
              >
                <span className="min-w-0 break-words">{option.label}</span>
                {value === option.value && (
                  <Check
                    aria-hidden="true"
                    className="size-4 shrink-0 text-foreground"
                  />
                )}
              </Button>
            ))}
          </div>
          {!filtered.length && (
            <p
              role="status"
              className="px-4 py-5 text-center text-sm text-muted-foreground"
            >
              No timezones found. Try a city or UTC offset.
            </p>
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
}
