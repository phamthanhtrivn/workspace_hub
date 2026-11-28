"use client";

import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";


interface JumpToRecentBannerProps {
  /** When true: viewing old history — shows text "Jump to Recent" */
  isViewingHistory: boolean;
  onAction: () => void;
}

/**
 * Floating banner at bottom/top of chat area.
 */
export default function JumpToRecentBanner({
  isViewingHistory,
  onAction,
}: JumpToRecentBannerProps) {
  return (
    <div className="absolute top-15 left-1/2 -translate-x-1/2 z-20">
      <Button variant="unstyled"
        onClick={onAction}
        className="cursor-pointer bg-primary hover:bg-primary text-primary-foreground px-4 py-2 rounded-full transition-all duration-200 flex items-center gap-2 text-xs font-semibold whitespace-nowrap"
      >
        {isViewingHistory ? (
          <>
            <span>Viewing older messages</span>
            <span className="bg-primary hover:bg-primary px-2 py-0.5 rounded-full text-xs transition-colors">
              Jump to Recent
            </span>
          </>
        ) : (
          <>
            <ChevronDown size={14} />
            <span>Scroll to Latest</span>
          </>
        )}
      </Button>
    </div>
  );
}
