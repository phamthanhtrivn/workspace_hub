"use client";

import { useId, useRef } from "react";
import { DialogPortal } from "@/components/ui/dialog";
import { FLOATING_UTILITY_LAYER_CLASS } from "@/components/ui/floating-utility-layer";
import { usePathname } from "next/navigation";
import { ChevronDown, ChevronUp, CloudOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useAppSelector } from "@/store/store";
import { cn } from "@/lib/utils";
import { usePomodoroSession } from "./pomodoro-session-provider";
import { PomodoroIslandDetails } from "./pomodoro-island-details";
import { POMODORO_MODE_THEMES } from "../constants/pomodoro-mode-theme";
import { formatTimerClock } from "../utils/pomodoro-timer-presentation";
import { useMiniTimerAnchor } from "../hooks/use-mini-timer-anchor";
import { useMiniTimerDrag } from "../hooks/use-mini-timer-drag";
import { useMiniTimerDisclosure } from "../hooks/use-mini-timer-disclosure";

function ActiveMiniTimer({ userId }: { userId: string }) {
  const { status, mode, timeLeft, busy, completionStatus, syncStatus, configLoadError } = usePomodoroSession();
  const contentId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const finished = status === "RUNNING" && timeLeft === 0;
  const syncFailed = syncStatus === "pending" || syncStatus === "error" || configLoadError;
  const { expanded, readyNotice, toggle, collapse } = useMiniTimerDisclosure({ mode, status,
    needsAttention: finished || completionStatus === "error" || syncFailed,
    noticeKey: `${finished}:${completionStatus}:${syncStatus}:${configLoadError}`,
  });
  const visible = status !== "IDLE" || readyNotice;
  const { timerRef, position, headerHandlers } = useMiniTimerDrag(userId, visible);
  const { anchorRef, anchorPosition } = useMiniTimerAnchor(visible);
  if (!visible) return null;
  const theme = POMODORO_MODE_THEMES[mode];
  const ModeIcon = theme.icon;

  const location = position ?? anchorPosition;
  const timer = <aside ref={timerRef} data-modal-companion="floating-utility" style={location ? { left: location.x, top: location.y } : undefined} aria-label="Pomodoro mini timer" data-expanded={expanded}
      className={cn(FLOATING_UTILITY_LAYER_CLASS, "fixed pointer-events-auto [--mini-timer-surface:var(--primary)] [--mini-timer-foreground:var(--primary-foreground)] dark:[--mini-timer-surface:var(--brand-ice)] dark:[--mini-timer-foreground:var(--brand-navy)] max-h-[calc(100dvh-7rem-env(safe-area-inset-bottom))] overflow-y-auto overscroll-contain bg-(--mini-timer-surface) text-(--mini-timer-foreground) shadow-dialog transition-[width,border-radius] duration-200 ease-out motion-reduce:transition-none",
        !position && "-translate-x-1/2", !location && "invisible",
        expanded ? "w-[min(27rem,calc(100%-2rem))] rounded-3xl" : "w-[min(19rem,calc(100%-2rem))] rounded-full")}
      onKeyDown={event => { if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); if (expanded) { collapse(); triggerRef.current?.focus({ preventScroll: true }); } } }}>
      <Button {...headerHandlers} ref={triggerRef} type="button" title="Drag to move; click to expand or collapse" variant="unstyled" aria-expanded={expanded} aria-controls={contentId}
        aria-label={`${expanded ? "Collapse" : "Expand"} ${theme.name.toLowerCase()} timer`}
        className={cn("flex min-h-12 w-full touch-none select-none cursor-grab items-center active:cursor-grabbing gap-3 px-4 py-3 text-(--mini-timer-foreground) hover:bg-(--mini-timer-foreground)/5 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-(--mini-timer-foreground)",
          expanded ? "rounded-t-3xl rounded-b-none" : "rounded-full")}
        onClick={toggle}>
        <span className="grid size-7 shrink-0 place-items-center rounded-full bg-(--mini-timer-foreground)/10">{busy ? <Spinner tone="inherit" size={16} /> : <ModeIcon aria-hidden="true" className="size-4" />}</span>
        <span className="flex min-w-0 flex-1 items-center gap-2 text-left text-xs font-medium">
          <span className="truncate">{theme.name}</span>
          {status === "PAUSED" && <span className="rounded bg-(--mini-timer-foreground)/15 px-1.5 py-0.5 text-xs">Paused</span>}
          {syncFailed && <CloudOff aria-label="Sync needs attention" className="size-3.5 shrink-0" />}
        </span>
        {!expanded && <span className="text-base font-semibold leading-none tabular-nums">{formatTimerClock(timeLeft)}</span>}
        {expanded ? <ChevronUp aria-hidden="true" className="size-4 shrink-0" /> : <ChevronDown aria-hidden="true" className="size-4 shrink-0" />}
      </Button>
      <div id={contentId} className={cn("grid transition-[grid-template-rows,visibility] duration-200 ease-out motion-reduce:transition-none",
        expanded ? "visible grid-rows-[1fr]" : "invisible grid-rows-[0fr]")} data-expanded={expanded} inert={!expanded} aria-hidden={!expanded}>
        <div className="min-h-0 overflow-hidden"><PomodoroIslandDetails /></div>
      </div>
    </aside>;
  return <>
    <div ref={anchorRef} aria-hidden="true" className="pointer-events-none h-0 shrink-0" />
    <DialogPortal>{timer}</DialogPortal>
  </>;
}

export function PomodoroMiniTimer() {
  const pathname = usePathname();
  const userId = useAppSelector(state => state.auth.userId);
  return userId && pathname !== "/pomodoro" ? <ActiveMiniTimer key={userId} userId={userId} /> : null;
}
