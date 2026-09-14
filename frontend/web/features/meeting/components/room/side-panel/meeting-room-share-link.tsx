"use client";

import { useMemo, useState } from "react";
import { Check, Copy, Link as LinkIcon } from "lucide-react";
import { toast } from "sonner";
import { MEETING_ROUTES } from "../../../types/meeting.constants";
import { MeetingIconButton } from "../../ui/meeting-icon-button";
import { MeetingInput } from "../../ui/meeting-form-controls";

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
        <MeetingInput
          readOnly
          icon={LinkIcon}
          value={inviteLink}
          aria-label="Meeting invite link"
          className="h-10 border-white/10 bg-black/20 text-xs font-semibold text-slate-300"
        />
        <MeetingIconButton
          label="Copy invite link"
          icon={copied ? Check : Copy}
          tone="secondary"
          controlSize="md"
          onClick={handleCopy}
          className="bg-white text-[#172B4D] hover:bg-slate-100"
        />
      </div>
    </div>
  );
}
