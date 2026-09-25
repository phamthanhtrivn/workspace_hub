import { FileText } from "lucide-react";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { CALENDAR_FORM_COPY as copy } from "../../constants/calendar-form-copy";

export function AttachmentEditor({ documentCount }: { documentCount: number }) {
  const [attachmentNames, setAttachmentNames] = useState<string[]>([]);

  return (
    <div className="space-y-2 rounded-2xl border border-slate-200/70 bg-slate-50/80 p-3">
      <label className="inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-slate-500">
        <FileText className="h-3.5 w-3.5" />
        {copy.addFile}
      </label>
      <label className="block cursor-pointer rounded-xl border border-dashed border-slate-300/80 bg-white px-3 py-2.5 text-xs font-semibold text-slate-600 transition hover:border-blue-400 hover:bg-blue-50/60">
        <Input
          type="file"
          multiple
          className="sr-only"
          aria-label={copy.addFile}
          onChange={(event) =>
            setAttachmentNames(
              Array.from(event.target.files || []).map((file) => file.name),
            )
          }
        />
        {copy.addFile}
        {attachmentNames.length > 0 && (
          <span className="mt-1 block truncate text-xs font-medium text-slate-500">
            {attachmentNames.join(", ")}
          </span>
        )}
        {documentCount > 0 && attachmentNames.length === 0 && (
          <span className="mt-1 block text-xs font-medium text-slate-500">
            {copy.attachedDocuments(documentCount)}
          </span>
        )}
      </label>
    </div>
  );
}
