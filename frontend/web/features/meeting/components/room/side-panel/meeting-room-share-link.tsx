"use client";

import { useMemo, useState } from "react";
import { Check, Copy, Link as LinkIcon } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { MEETING_ROUTES } from "../../../types/meeting.constants";
import { MeetingIconButton } from "../../ui/meeting-icon-button";

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
      toast.success("Meeting link copied");
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.error("Could not copy meeting link");
    }
  };

  return (
    <div className="rounded-lg bg-white/6 p-4 ring-1 ring-white/8">
      <div className="flex items-center gap-3">
        <p className="text-sm font-black text-slate-100">
          Invite link
        </p>
      </div>

      <div className="mt-3 flex min-w-0 items-center gap-2">
        <div className="flex h-10 min-w-0 flex-1 items-center gap-2.5 rounded-lg border border-white/10 bg-black/25 px-3 transition focus-within:border-white/20 focus-within:ring-1 focus-within:ring-white/10">
          <LinkIcon className="size-4 shrink-0 text-slate-400" />
          <input
            readOnly
            value={inviteLink}
            aria-label="Meeting invite link"
            className="w-full min-w-0 bg-transparent text-xs font-semibold text-slate-300 outline-none select-all truncate placeholder:text-slate-500"
          />
        </div>
        <MeetingIconButton
          label="Copy invite link"
          icon={copied ? Check : Copy}
          tone="ghost"
          controlSize="md"
          onClick={handleCopy}
          className={cn(
            "size-10 shrink-0 rounded-lg border transition duration-150",
            copied
              ? "border-emerald-500/30 bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 hover:text-emerald-200"
              : "border-white/10 bg-white/10 text-slate-200 hover:bg-white/15 hover:text-white active:bg-white/20",
          )}
        />
      </div>
    </div>
  );
}
