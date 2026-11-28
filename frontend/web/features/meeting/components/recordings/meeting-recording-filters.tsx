"use client";

import { Search, X } from "lucide-react";
import { CustomDatePicker } from "@/components/ui/custom/custom-date-picker";
import { CustomSelect } from "@/components/ui/custom/custom-select";
import type { RecordingQuery } from "../../types/meeting-recording.types";
import type { RecordingDateFilter } from "../../utils/recording-date-filter";
import { MeetingButton, MeetingInput } from "../ui/meeting-form-controls";

interface RecordingFiltersProps {
  search: string;
  scope: NonNullable<RecordingQuery["scope"]>;
  dates: RecordingDateFilter;
  invalidDates: boolean;
  onSearchChange: (value: string) => void;
  onScopeChange: (value: NonNullable<RecordingQuery["scope"]>) => void;
  onDatesChange: (value: RecordingDateFilter) => void;
  onReset: () => void;
}

export function MeetingRecordingFilters({
  search,
  scope,
  dates,
  invalidDates,
  onSearchChange,
  onScopeChange,
  onDatesChange,
  onReset,
}: RecordingFiltersProps) {
  const active = Boolean(
    search.trim() || scope !== "all" || dates.from || dates.to,
  );

  return (
    <section
      aria-label="Recording filters"
      className="space-y-3 rounded-panel border border-border bg-card p-4"
    >
      <div className="grid min-w-0 grid-cols-2 items-end gap-3 @min-[600px]/meeting-content:grid-cols-3 @min-[960px]/meeting-content:grid-cols-[minmax(0,1fr)_144px_144px_144px_auto]">
        <div className="col-span-2 min-w-0 @min-[600px]/meeting-content:col-span-3 @min-[960px]/meeting-content:col-span-1">
          <label htmlFor="recording-search" className="sr-only">
            Search recordings
          </label>
          <MeetingInput
            id="recording-search"
            icon={Search}
            placeholder="Search recordings…"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            containerClassName="w-full"
          />
        </div>
        <div className="col-span-2 min-w-0 @min-[600px]/meeting-content:col-span-1">
          <label htmlFor="recording-access-filter" className="sr-only">
            Recording access
          </label>
          <CustomSelect
            id="recording-access-filter"
            ariaLabel="Recording access filter"
            value={scope}
            onChange={(value) =>
              onScopeChange(value as NonNullable<RecordingQuery["scope"]>)
            }
            options={[
              { value: "all", label: "All accessible" },
              { value: "owned", label: "Owned by me" },
              { value: "shared", label: "Shared with me" },
            ]}
            triggerClassName="h-10 w-full"
          />
        </div>
        <div className="min-w-0">
          <label htmlFor="recording-from-date" className="sr-only">
            From date
          </label>
          <CustomDatePicker
            id="recording-from-date"
            placeholder="From date"
            value={dates.from}
            onChange={(from) => onDatesChange({ ...dates, from })}
            max={dates.to || undefined}
            ariaLabel="Recordings from date"
            invalid={invalidDates}
            allowClear
            triggerClassName="h-10 w-full"
          />
        </div>
        <div className="min-w-0">
          <label htmlFor="recording-to-date" className="sr-only">
            To date
          </label>
          <CustomDatePicker
            id="recording-to-date"
            placeholder="To date"
            value={dates.to}
            onChange={(to) => onDatesChange({ ...dates, to })}
            min={dates.from || undefined}
            ariaLabel="Recordings to date"
            invalid={invalidDates}
            allowClear
            triggerClassName="h-10 w-full"
          />
        </div>
        {active && (
          <div className="col-span-2 flex justify-end @min-[600px]/meeting-content:col-span-3 @min-[960px]/meeting-content:col-span-1">
            <MeetingButton tone="outline" className="h-10" onClick={onReset}>
              <X className="size-4" aria-hidden="true" />
              Clear filters
            </MeetingButton>
          </div>
        )}
      </div>
      {invalidDates && (
        <p className="text-xs text-destructive-content" role="alert">
          Choose an end date on or after the start date.
        </p>
      )}
    </section>
  );
}
