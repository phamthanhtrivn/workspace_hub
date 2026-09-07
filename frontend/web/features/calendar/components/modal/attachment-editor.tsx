import { FileText } from "lucide-react";
import { useState } from "react";
import { useAppIntl } from "@/features/i18n/useAppIntl";

export function AttachmentEditor({ documentCount }: { documentCount: number }) {
  const intl = useAppIntl();
  const [attachmentNames, setAttachmentNames] = useState<string[]>([]);

  return (
    <div className="space-y-3 rounded-xl border border-slate-200 p-3">
      <label className="inline-flex items-center gap-2 text-xs font-black uppercase text-slate-400">
        <FileText className="h-4 w-4" />
        {intl.formatMessage({ id: "calendar.quick.addFile" })}
      </label>
      <label className="block cursor-pointer rounded-lg border border-dashed border-slate-300 bg-white px-3 py-3 text-sm font-semibold text-slate-600 transition hover:border-blue-400 hover:bg-blue-50/50">
        <input
          type="file"
          multiple
          className="sr-only"
          aria-label={intl.formatMessage({ id: "calendar.quick.addFile" })}
          onChange={(event) =>
            setAttachmentNames(
              Array.from(event.target.files || []).map((file) => file.name),
            )
          }
        />
        {intl.formatMessage({ id: "calendar.quick.addFile" })}
        {attachmentNames.length > 0 && (
          <span className="mt-1 block truncate text-xs font-medium text-slate-500">
            {attachmentNames.join(", ")}
          </span>
        )}
        {documentCount > 0 && attachmentNames.length === 0 && (
          <span className="mt-1 block text-xs font-medium text-slate-500">
            {intl.formatMessage(
              { id: "calendar.attachedDocuments" },
              { count: documentCount },
            )}
          </span>
        )}
      </label>
    </div>
  );
}
