import { useId as useInputFieldId } from "react";
import { SpaceResponse } from "@/features/chat/types/chat.types";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";


interface OverviewTabProps {
  detail: SpaceResponse;
  isOwner: boolean;
  isLoadingDetails: boolean;
  isSaving: boolean;
  originalName: string;
  spaceName: string;
  onSpaceNameChange: (name: string) => void;
  onSave: () => void;
}

export function OverviewTab({
  detail,
  isOwner,
  isLoadingDetails,
  isSaving,
  originalName,
  spaceName,
  onSpaceNameChange,
  onSave,
}: OverviewTabProps) {
  const inputFieldId = useInputFieldId();
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-3">
        <OverviewStat
          label="Members"
          value={isLoadingDetails ? "-" : (detail.memberCount ?? 0)}
        />
        <OverviewStat
          label="Channels"
          value={isLoadingDetails ? "-" : (detail.channelCount ?? 0)}
        />
        <OverviewStat
          label="Created Date"
          value={
            detail.createdAt
              ? new Date(detail.createdAt).toLocaleDateString("en-US")
              : "-"
          }
          compact
        />
      </div>

      <div className="space-y-2">
        <label htmlFor={`${inputFieldId}-field-53`} className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Space Name
        </label>
        <div className="flex gap-2">
          <Input id={`${inputFieldId}-field-53`} aria-label="Space Name" unstyled
            type="text"
            value={spaceName}
            disabled={!isOwner || isSaving}
            onChange={(event) => onSpaceNameChange(event.target.value)}
            className="flex-1 rounded-control border border-input bg-card px-3 py-2 text-sm outline-none focus:border-info-outline focus:ring-4 focus:ring-ring disabled:bg-background disabled:text-muted-foreground"
            maxLength={50}
          />
          {isOwner && (
            <Button loading={isSaving} variant="default"
              type="button"
              disabled={
                isSaving ||
                !spaceName.trim() ||
                spaceName.trim() === originalName
              }
              onClick={onSave}
              className="px-4 py-2 rounded-control text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {isSaving ? "Saving..." : "Save"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function OverviewStat({
  label,
  value,
  compact,
}: {
  label: string;
  value: string | number;
  compact?: boolean;
}) {
  return (
    <div className="rounded-panel border border-border bg-background p-3">
      <p className="text-xs font-semibold text-muted-foreground">{label}</p>
      <p
        className={
          compact
            ? "mt-1 text-xs font-semibold text-foreground"
            : "mt-1 text-xl font-semibold text-foreground"
        }
      >
        {value}
      </p>
    </div>
  );
}

