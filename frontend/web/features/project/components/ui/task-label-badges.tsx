"use client";

import type { KeyboardEvent, MouseEvent } from "react";
import type { TaskLabel } from "@/features/project/types/project";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { LabelBadge } from "./status-badge";

const DEFAULT_VISIBLE_LABELS = 2;

interface TaskLabelBadgesProps {
  labels: TaskLabel[];
  maxVisible?: number;
  className?: string;
}

export default function TaskLabelBadges({
  labels,
  maxVisible = DEFAULT_VISIBLE_LABELS,
  className,
}: TaskLabelBadgesProps) {
  if (labels.length === 0) return null;

  const visibleLabels = labels.slice(0, maxVisible);
  const hiddenLabels = labels.slice(maxVisible);

  const stopParentActivation = (
    event: MouseEvent<HTMLSpanElement> | KeyboardEvent<HTMLSpanElement>,
  ) => {
    event.stopPropagation();
  };

  return (
    <div
      className={cn(
        "relative z-20 flex flex-wrap items-center gap-1 overflow-visible select-none",
        className,
      )}
    >
      {visibleLabels.map((label) => (
        <LabelBadge key={label.id} name={label.name} color={label.color} />
      ))}
      {hiddenLabels.length > 0 ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <span
              tabIndex={0}
              aria-label={`${hiddenLabels.length} more labels`}
              onClick={stopParentActivation}
              onKeyDown={stopParentActivation}
              className="inline-flex h-5 min-w-6 cursor-default items-center justify-center rounded-full bg-muted px-2 font-mono text-xs font-semibold text-muted-foreground ring-1 ring-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              +{hiddenLabels.length}
            </span>
          </TooltipTrigger>
          <TooltipContent className="bottom-auto top-full z-[220] mt-1 mb-0 max-w-56 whitespace-normal p-2">
            <div className="flex max-w-52 flex-wrap gap-1">
              {hiddenLabels.map((label) => (
                <LabelBadge
                  key={label.id}
                  name={label.name}
                  color={label.color}
                />
              ))}
            </div>
          </TooltipContent>
        </Tooltip>
      ) : null}
    </div>
  );
}
