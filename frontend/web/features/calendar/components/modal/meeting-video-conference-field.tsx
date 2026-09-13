"use client";

import { Check, Copy, ExternalLink, Trash2, Video } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useAppIntl } from "@/features/i18n/useAppIntl";

interface MeetingVideoConferenceFieldProps {
  meetUrl: string | null;
  onAddMeeting: () => void;
  onRemoveMeeting: () => void;
}

export function MeetingVideoConferenceField({
  meetUrl,
  onAddMeeting,
  onRemoveMeeting,
}: MeetingVideoConferenceFieldProps) {
  const intl = useAppIntl();
  const [copiedMeet, setCopiedMeet] = useState(false);

  const handleCopy = async () => {
    if (!meetUrl) return;
    try {
      await navigator.clipboard.writeText(meetUrl);
      setCopiedMeet(true);
      setTimeout(() => setCopiedMeet(false), 2000);
      toast.success(
        intl.locale === "vi"
          ? "Đã sao chép liên kết cuộc họp Meeting"
          : "Meeting link copied to clipboard",
      );
    } catch {
      // ignore clipboard error
    }
  };

  if (!meetUrl) {
    return (
      <button
        type="button"
        onClick={onAddMeeting}
        className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-xs transition-all hover:bg-blue-700 active:scale-[0.98]"
      >
        <Video className="h-4 w-4" />
        <span>
          {intl.locale === "vi"
            ? "Thêm cuộc họp video Meeting"
            : "Add Meeting video call"}
        </span>
      </button>
    );
  }

  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-blue-200/80 bg-white/90 p-2.5 shadow-xs">
      <div className="flex min-w-0 items-center gap-2.5">
        <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-blue-600 text-white shadow-xs">
          <Video className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <a
            href={meetUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-700 hover:underline"
          >
            <span>
              {intl.locale === "vi"
                ? "Tham gia cuộc họp Meeting"
                : "Join Meeting"}
            </span>
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
          <p className="truncate text-xs font-mono text-slate-500">
            {meetUrl.replace(/^https?:\/\//, "")}
          </p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <button
          type="button"
          onClick={handleCopy}
          className="grid h-8 w-8 cursor-pointer place-items-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800"
          title={intl.locale === "vi" ? "Sao chép liên kết" : "Copy link"}
        >
          {copiedMeet ? (
            <Check className="h-4 w-4 text-emerald-600" />
          ) : (
            <Copy className="h-4 w-4" />
          )}
        </button>
        <button
          type="button"
          onClick={onRemoveMeeting}
          className="grid h-8 w-8 cursor-pointer place-items-center rounded-lg text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600"
          title={intl.locale === "vi" ? "Xóa cuộc họp" : "Remove meeting"}
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
