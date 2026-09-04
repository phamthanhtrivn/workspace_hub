"use client";

import { useMemo, useState } from "react";
import { Check, Copy, Link as LinkIcon } from "lucide-react";
import { toast } from "sonner";
import { useAppIntl } from "@/features/i18n/useAppIntl";
import { MEETING_ROUTES } from "../../../types/meeting.constants";

interface MeetingRoomShareLinkProps {
  joinToken: string;
}

function copyTextFallback(text: string) {
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();

  const copied = document.execCommand("copy");
  document.body.removeChild(textarea);

  if (!copied) {
    throw new Error("Copy command failed");
  }
}

export function MeetingRoomShareLink({ joinToken }: MeetingRoomShareLinkProps) {
  const intl = useAppIntl();
  const [copied, setCopied] = useState(false);
  const inviteLink = useMemo(() => {
    if (typeof window === "undefined") return "";

    return `${window.location.origin}${MEETING_ROUTES.room(joinToken)}`;
  }, [joinToken]);

  const handleCopy = async () => {
    if (!inviteLink) return;

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(inviteLink);
      } else {
        copyTextFallback(inviteLink);
      }

      setCopied(true);
      toast.success(intl.formatMessage({ id: "meeting.room.share.copied" }));
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.error(intl.formatMessage({ id: "meeting.room.share.copyFailed" }));
    }
  };

  return (
    <div className="rounded-lg bg-white/6 p-4 ring-1 ring-white/8">
      <div className="flex items-center gap-3">
        <p className="text-sm font-black text-slate-100">
          {intl.formatMessage({ id: "meeting.room.share.title" })}
        </p>
      </div>

      <div className="mt-3 flex min-w-0 items-center gap-1 rounded-lg bg-black/20 p-2 ring-1 ring-white/10">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-blue-500/16 text-blue-200 ring-1 ring-blue-200/12">
          <LinkIcon className="h-4 w-4" />
        </span>
        <input
          readOnly
          value={inviteLink}
          aria-label={intl.formatMessage({
            id: "meeting.room.share.linkLabel",
          })}
          className="min-w-0 flex-1 bg-transparent px-2 text-xs font-semibold text-slate-300 outline-none"
        />
        <button
          type="button"
          onClick={handleCopy}
          className="cursor-pointer grid h-9 w-9 shrink-0 place-items-center rounded-md bg-white text-[#172B4D] transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
          aria-label={intl.formatMessage({ id: "meeting.room.share.copy" })}
        >
          {copied ? (
            <Check className="h-4 w-4 text-emerald-600" />
          ) : (
            <Copy className="h-4 w-4" />
          )}
        </button>
      </div>
    </div>
  );
}
