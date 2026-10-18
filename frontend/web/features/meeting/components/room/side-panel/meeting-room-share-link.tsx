"use client";

import { useMemo, useState } from "react";
import { Check, Copy, Link as LinkIcon } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { MEETING_ROUTES } from "../../../types/meeting.constants";
import { MeetingIconButton } from "../../ui/meeting-icon-button";
import { Input } from "@/components/ui/input";


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
    <div className="rounded-lg bg-accent p-4 ring-1 ring-border/8">
      <div className="flex items-center gap-3">
        <p className="text-sm font-semibold text-muted-foreground">
          Invite link
        </p>
      </div>

      <div className="mt-3 flex min-w-0 items-center gap-2">
        <div className="flex h-10 min-w-0 flex-1 items-center gap-2.5 rounded-lg border border-input bg-background px-3 transition focus-within:border-input focus-within:ring-1 focus-within:ring-ring">
          <LinkIcon className="size-4 shrink-0 text-muted-foreground" />
          <Input unstyled
            readOnly
            value={inviteLink}
            aria-label="Meeting invite link"
            className="w-full min-w-0 bg-transparent text-xs font-semibold text-muted-foreground outline-none select-all truncate placeholder:text-muted-foreground"
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
              ? "border-success-outline/30 bg-success-soft text-success-content hover:bg-success-soft hover:text-success-content"
              : "border-border bg-accent text-muted-foreground hover:bg-accent hover:text-foreground active:bg-accent",
          )}
        />
      </div>
    </div>
  );
}
