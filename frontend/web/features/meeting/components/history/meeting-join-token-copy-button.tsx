"use client";

import { Check, Hash } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useAppIntl } from "@/features/i18n/useAppIntl";
import { cn } from "@/lib/utils";
import { copyTextFallback } from "../../utils/meeting-history.utils";

interface MeetingJoinTokenCopyButtonProps {
  joinToken: string;
  className?: string;
  iconClassName?: string;
}

export function MeetingJoinTokenCopyButton({
  joinToken,
  className,
  iconClassName,
}: MeetingJoinTokenCopyButtonProps) {
  const intl = useAppIntl();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(joinToken);
      } else {
        copyTextFallback(joinToken);
      }

      setCopied(true);
      toast.success(
        intl.formatMessage({ id: "meeting.history.joinTokenCopied" }),
      );
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.error(
        intl.formatMessage({ id: "meeting.history.joinTokenCopyFailed" }),
      );
    }
  };

  const copyLabel = intl.formatMessage(
    { id: "meeting.history.copyJoinToken" },
    { joinToken },
  );

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={cn(
        "flex min-w-0 max-w-full cursor-pointer items-center gap-2 rounded-md text-xs font-bold text-slate-500 transition hover:text-[#0052CC] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0052CC] focus-visible:ring-offset-2",
        className,
      )}
      aria-label={copyLabel}
      title={copyLabel}
    >
      {copied ? (
        <Check
          className={cn("h-4 w-4 shrink-0 text-emerald-600", iconClassName)}
        />
      ) : (
        <Hash
          className={cn("h-4 w-4 shrink-0 text-[#0052CC]", iconClassName)}
        />
      )}
      <span className="truncate font-mono">{joinToken}</span>
    </button>
  );
}
