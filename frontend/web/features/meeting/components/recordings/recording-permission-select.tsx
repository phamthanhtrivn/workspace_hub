import { MeetingSelect } from "../ui/meeting-form-controls";

const recordingPermissionOptions = [
  { value: "view", label: "Can view" },
  { value: "download", label: "Can download" },
];

export function RecordingPermissionSelect({
  canDownload,
  onChange,
  label,
  disabled,
  compact = false,
}: {
  canDownload: boolean;
  onChange: (canDownload: boolean) => void;
  label: string;
  disabled?: boolean;
  compact?: boolean;
}) {
  return (
    <MeetingSelect
      value={canDownload ? "download" : "view"}
      options={recordingPermissionOptions}
      onChange={(value) => onChange(value === "download")}
      ariaLabel={label}
      disabled={disabled}
      triggerClassName={
        compact
          ? "h-8 w-32 max-w-full border-0 bg-transparent px-1.5 text-xs text-muted-foreground hover:bg-background hover:text-foreground"
          : "h-10 w-36 max-w-full text-xs"
      }
    />
  );
}
