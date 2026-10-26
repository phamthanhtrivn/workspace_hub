"use client";

import { useId } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { MEETING_HISTORY_BULK_LABELS } from "../../types/meeting.constants";
import { MeetingButton } from "../ui/meeting-form-controls";

interface MeetingHistoryBulkToolbarProps {
  hidden: boolean;
  selectedCount: number;
  eligibleCount: number;
  actionableTotal: number;
  disabled: boolean;
  onSelectPage: (checked: boolean) => void;
  onSelected: () => void;
  onAll: () => void;
}

export function MeetingHistoryBulkToolbar({ hidden, selectedCount, eligibleCount, actionableTotal, disabled, onSelectPage, onSelected, onAll }: MeetingHistoryBulkToolbarProps) {
  const checkboxId = useId();
  return (
    <div role="group" aria-label={MEETING_HISTORY_BULK_LABELS.actions} className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <Checkbox id={checkboxId} disabled={disabled || !eligibleCount}
            checked={selectedCount && selectedCount === eligibleCount ? true : selectedCount ? "indeterminate" : false}
            onCheckedChange={onSelectPage} />
          <label htmlFor={checkboxId} className="cursor-pointer text-xs font-medium text-foreground">{MEETING_HISTORY_BULK_LABELS.selectPage}</label>
        </div>
        <span aria-live="polite" className="text-xs text-muted-foreground">{MEETING_HISTORY_BULK_LABELS.selectedCount(selectedCount)}</span>
      </div>
      <div className="flex flex-wrap gap-2">
        <MeetingButton type="button" tone="outline" disabled={disabled || !selectedCount} onClick={onSelected}>
          {hidden ? MEETING_HISTORY_BULK_LABELS.restoreSelected : MEETING_HISTORY_BULK_LABELS.hideSelected}
        </MeetingButton>
        <MeetingButton type="button" tone="secondary" disabled={disabled || !actionableTotal} onClick={onAll}>
          {hidden ? MEETING_HISTORY_BULK_LABELS.restoreAll : MEETING_HISTORY_BULK_LABELS.hideAll} ({actionableTotal})
        </MeetingButton>
      </div>
    </div>
  );
}
