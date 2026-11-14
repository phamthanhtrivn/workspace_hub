"use client";

import {
  AlertCircle,
  Bot,
  CheckCircle2,
  RefreshCw,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { LoadingState } from "@/components/ui/loading-state";
import { aiServiceMessage } from "@/lib/ai-feedback";
import { cn } from "@/lib/utils";
import { meetingSummaryPresentation } from "../../utils/meeting-summary-presentation";
import { useMeetingSummary } from "../../hooks/use-meeting-summary";
import { MeetingButton } from "../ui/meeting-form-controls";
import { MeetingRecordingSummaryProgress } from "./meeting-recording-summary-progress";

export function MeetingRecordingSummary({
  recordingId,
}: {
  recordingId: string;
}) {
  const state = useMeetingSummary(recordingId);
  const summary = state.summary;
  const running = summary?.status === "QUEUED" || summary?.status === "RUNNING";
  const unavailable =
    !!summary && (!summary.enabled || summary.availability === "UNAVAILABLE");
  const completed = summary?.status === "COMPLETED";
  const presentation = meetingSummaryPresentation(summary, state.unavailable);

  return (
    <section
      className="mt-5 space-y-5 rounded-panel border border-border bg-card p-4 text-card-foreground sm:p-5"
      aria-labelledby="meeting-summary-title"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span
            className={cn(
              "grid size-10 shrink-0 place-items-center rounded-control transition-colors",
              presentation.className,
            )}
          >
            <Bot className="size-5" aria-hidden="true" />
          </span>
          <div>
            <h3 id="meeting-summary-title" className="text-base font-semibold">
              Meeting summary
            </h3>
            <p className="mt-0.5 text-xs text-muted-foreground">
              One saved summary for people with recording access.
            </p>
          </div>
        </div>
        {!state.loading && (summary || state.unavailable) && (
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-control px-2.5 py-1 text-xs font-medium transition-colors",
              presentation.className,
            )}
          >
            {completed && (
              <CheckCircle2 className="size-3.5" aria-hidden="true" />
            )}
            {presentation.label}
          </span>
        )}
      </div>
      {state.loading ? (
        <LoadingState label="Loading summary…" />
      ) : state.unavailable ? (
        <div className="space-y-3 text-sm" role="alert">
          <p>Unable to load this summary. Check your access and try again.</p>
          <MeetingButton tone="outline" onClick={() => void state.refresh()}>
            <RefreshCw className="size-4" aria-hidden="true" />
            Retry
          </MeetingButton>
        </div>
      ) : summary ? (
        <>
          {(unavailable || summary.unavailableReason) && (
            <div
              className="space-y-3 text-sm text-muted-foreground"
              role="status"
            >
              <p>
                {summary.unavailableReason ||
                  (!summary.enabled
                    ? "Meeting summaries are not configured."
                    : "Meeting summary processing is temporarily unavailable. Please try again shortly.")}
              </p>
              {summary.enabled && unavailable && (
                <MeetingButton
                  tone="outline"
                  onClick={() => void state.refresh()}
                >
                  <RefreshCw className="size-4" aria-hidden="true" />
                  Check availability
                </MeetingButton>
              )}
            </div>
          )}
          {running && (
            <MeetingRecordingSummaryProgress
              stage={summary.stage}
              transcribedChunks={summary.transcribedChunks}
            />
          )}
          {completed && (
            <div className="space-y-4">
              <div
                tabIndex={0}
                aria-label="Generated meeting summary"
                className="max-h-96 overflow-y-auto whitespace-pre-wrap break-words rounded-control border border-border bg-background p-4 text-sm leading-7 [overflow-wrap:anywhere] focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ring"
              >
                {summary.content}
              </div>
              <p className="flex items-start gap-2 text-xs leading-5 text-muted-foreground">
                <ShieldCheck
                  className="mt-0.5 size-4 shrink-0"
                  aria-hidden="true"
                />
                <span>
                  AI-generated summary. Check decisions and action items against
                  the recording. Timestamps are approximate; speakers are not
                  identified from mixed audio.
                </span>
              </p>
            </div>
          )}
          {summary.status === "FAILED" && (
            <p
              className="flex items-start gap-2 rounded-control bg-destructive-soft p-3 text-sm leading-6 text-destructive-content"
              role="alert"
            >
              <AlertCircle
                className="mt-1 size-4 shrink-0"
                aria-hidden="true"
              />
              {aiServiceMessage(
                summary.error,
                "Unable to generate a summary. Try again.",
              )}
            </p>
          )}
          {summary.enabled &&
            !unavailable &&
            summary.canCreate &&
            !running &&
            !completed && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <p className="text-sm leading-6">
                    Generate a shared summary from the speech in this recording.
                  </p>
                  <p className="text-xs leading-6 text-muted-foreground">
                    Audio is transcribed by the local speech service. The
                    transcript is sent to the configured AI provider for
                    summarization. Provider charges may apply.
                  </p>
                </div>
                <MeetingButton
                  disabled={state.creating}
                  loading={state.creating}
                  onClick={state.create}
                >
                  {!state.creating &&
                    (summary.status === "FAILED" ? (
                      <RefreshCw className="size-4" aria-hidden="true" />
                    ) : (
                      <Sparkles className="size-4" aria-hidden="true" />
                    ))}
                  {state.creating
                    ? "Requesting summary..."
                    : summary.status === "FAILED"
                      ? "Retry summary"
                      : "Summarize with AI"}
                </MeetingButton>
              </div>
            )}
          {!unavailable &&
            !summary.unavailableReason &&
            !summary.canCreate &&
            summary.status === "NOT_CREATED" && (
              <p className="text-sm leading-6 text-muted-foreground">
                Only the recording owner can generate a summary. It will be
                available here once generated.
              </p>
            )}
          {state.createError && (
            <p className="text-sm text-destructive-content" role="alert">
              Unable to start the summary. Try again later.
            </p>
          )}
        </>
      ) : null}
    </section>
  );
}
