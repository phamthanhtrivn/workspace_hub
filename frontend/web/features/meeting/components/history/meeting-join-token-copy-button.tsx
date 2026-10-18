"use client";

import { Check, Hash } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { copyTextFallback } from "../../utils/meeting-history.utils";
import { Button } from "@/components/ui/button";


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
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(joinToken);
      } else {
        copyTextFallback(joinToken);
      }

      setCopied(true);
      toast.success("Join token copied");
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.error("Could not copy join token");
    }
  };

  const copyLabel = `Copy join token ${joinToken}`;

  return (
    <Button variant="unstyled"
      type="button"
      onClick={handleCopy}
      className={cn(
        "flex min-w-0 max-w-full cursor-pointer items-center gap-2 rounded-md text-xs font-semibold text-muted-foreground transition hover:text-info-content focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        className,
      )}
      aria-label={copyLabel}
      title={copyLabel}
    >
      {copied ? (
        <Check
          className={cn("h-4 w-4 shrink-0 text-success-content", iconClassName)}
        />
      ) : (
        <Hash
          className={cn("h-4 w-4 shrink-0 text-info-content", iconClassName)}
        />
      )}
      <span className="truncate font-mono">{joinToken}</span>
    </Button>
  );
}
