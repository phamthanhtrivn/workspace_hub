import { AudioLines, Check, FileAudio, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { Spinner } from "@/components/ui/spinner";
import type { MeetingSummary } from "../../types/meeting-summary.types";

const summarySteps = [
  { stage: "EXTRACTING", label: "Preparing audio", icon: FileAudio },
  { stage: "TRANSCRIBING", label: "Transcribing", icon: AudioLines },
  { stage: "SUMMARIZING", label: "Summarizing", icon: Sparkles },
] as const;

export function MeetingRecordingSummaryProgress({
  stage,
  transcribedChunks,
}: Pick<MeetingSummary, "stage" | "transcribedChunks">) {
  const current = summarySteps.findIndex((step) => step.stage === stage);

  return (
    <div className="space-y-4" role="status" aria-live="polite">
      <p className="flex items-center gap-2 text-sm font-medium">
        <Spinner />
        {current < 0
          ? "Queued for processing…"
          : `${summarySteps[current].label}…`}
      </p>
      <ol className="grid gap-3 sm:grid-cols-3" aria-label="Summary progress">
        {summarySteps.map((step, index) => {
          const Icon = index < current ? Check : step.icon;

          return (
            <li
              key={step.stage}
              aria-current={index === current ? "step" : undefined}
              className={cn(
                "flex items-center gap-2 rounded-control border border-border px-3 py-2 text-xs",
                index === current
                  ? "border-info-outline bg-info-soft text-info-content"
                  : "text-muted-foreground",
              )}
            >
              <Icon className="size-4 shrink-0" aria-hidden="true" />
              {step.label}
            </li>
          );
        })}
      </ol>
      {stage === "TRANSCRIBING" && !!transcribedChunks && (
        <p className="text-xs tabular-nums text-muted-foreground">
          Processed {transcribedChunks} segments.
        </p>
      )}
      <p className="text-xs leading-5 text-muted-foreground">
        You can close this player. Processing continues in the background.
      </p>
    </div>
  );
}
