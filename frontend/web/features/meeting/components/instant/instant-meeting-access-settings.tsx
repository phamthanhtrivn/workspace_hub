import { ShieldCheck } from "lucide-react";
import { useAppIntl } from "@/features/i18n/useAppIntl";

interface InstantMeetingAccessSettingsProps {
  allowJoinWithoutApproval: boolean;
  onAllowJoinWithoutApprovalChange: (value: boolean) => void;
}

export function InstantMeetingAccessSettings({
  allowJoinWithoutApproval,
  onAllowJoinWithoutApprovalChange,
}: InstantMeetingAccessSettingsProps) {
  const intl = useAppIntl();

  return (
    <aside className="space-y-3">
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
        <div className="flex items-start gap-3">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-white text-blue-600 ring-1 ring-slate-200">
            <ShieldCheck className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              {intl.formatMessage({
                id: "meeting.deviceSetup.accessTitle",
              })}
            </h3>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              {intl.formatMessage({
                id: "meeting.deviceSetup.accessDescription",
              })}
            </p>
          </div>
        </div>
      </div>

      <label className="flex items-start gap-3 rounded-md border border-slate-200 px-3 py-3">
        <input
          type="checkbox"
          checked={allowJoinWithoutApproval}
          onChange={(event) =>
            onAllowJoinWithoutApprovalChange(event.target.checked)
          }
          className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
        />
        <span>
          <span className="block text-sm font-semibold text-slate-800">
            {intl.formatMessage({ id: "meeting.allowWithoutApproval" })}
          </span>
          <span className="mt-1 block text-xs leading-5 text-slate-500">
            {intl.formatMessage({
              id: "meeting.allowWithoutApprovalHelp",
            })}
          </span>
        </span>
      </label>
    </aside>
  );
}
