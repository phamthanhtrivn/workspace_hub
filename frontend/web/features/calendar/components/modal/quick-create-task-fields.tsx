"use client";

import { Paperclip } from "lucide-react";
import { useState } from "react";
import { useAppIntl } from "@/features/i18n/useAppIntl";

export function QuickCreateTaskFields() {
  const intl = useAppIntl();
  const [files, setFiles] = useState<string[]>([]);

  return (
    <div className="space-y-3.5">

      <div className="space-y-1.5">
        <label className="text-xs font-medium uppercase tracking-wider text-slate-500">
          {intl.formatMessage({ id: "calendar.quick.addFile" })}
        </label>
        <label className="block cursor-pointer rounded-lg border border-dashed border-slate-200 bg-slate-50/50 px-3 py-2.5 text-xs font-medium text-slate-600 transition hover:border-blue-400 hover:bg-blue-50/50">
          <input
            type="file"
            multiple
            className="sr-only"
            aria-label={intl.formatMessage({ id: "calendar.quick.addFile" })}
            onChange={(event) =>
              setFiles(
                Array.from(event.target.files || []).map((file) => file.name),
              )
            }
          />
          <div className="flex items-center gap-2">
            <Paperclip className="h-4 w-4 text-slate-400" />
            <span>{intl.formatMessage({ id: "calendar.quick.addFile" })}</span>
          </div>
          {files.length > 0 && (
            <span className="mt-1 block truncate text-xs text-slate-500">
              {files.join(", ")}
            </span>
          )}
        </label>
      </div>
    </div>
  );
}
