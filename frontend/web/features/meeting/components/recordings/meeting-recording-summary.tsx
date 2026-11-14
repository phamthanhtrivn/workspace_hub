"use client";

import { useMeetingSummary } from "../../hooks/use-meeting-summary";
import { MeetingButton } from "../ui/meeting-form-controls";
import { Bot } from "lucide-react";
import { aiServiceMessage } from "@/lib/ai-feedback";

export function MeetingRecordingSummary({
  recordingId,
}: {
  recordingId: string;
}) {
  const state = useMeetingSummary(recordingId);
  const summary = state.summary;
  const running = summary?.status === "QUEUED" || summary?.status === "RUNNING";
  const labels = {
    QUEUED: "Queued...",
    EXTRACTING: "Preparing audio...",
    TRANSCRIBING: "Transcribing...",
    SUMMARIZING: "Summarizing meeting...",
    COMPLETED: "Completed",
    FAILED: "Failed",
  };
  if (state.loading)
    return (
      <p className="text-sm text-muted-foreground" role="status">
        Loading summary...
      </p>
    );
  if (state.unavailable)
    return (
      <div className="mt-4 text-sm" role="alert">
        <p>Unable to load this summary. Check your access and try again.</p>
        <MeetingButton
          tone="secondary"
          className="mt-2"
          onClick={() => void state.refresh()}
        >
          Retry
        </MeetingButton>
      </div>
    );
  if (!summary) return null;
  const unavailable =
    !summary.enabled || summary.availability === "UNAVAILABLE";

  return (
    <section
      className="mt-4 border-t border-border pt-4"
      aria-labelledby="meeting-summary-title"
    >
      <h3
        id="meeting-summary-title"
        className="flex items-center gap-2 text-base font-semibold"
      >
        <Bot className="size-4 text-link" aria-hidden="true" />
        Meeting summary
      </h3>
      {(unavailable || summary.unavailableReason) && (
        <div className="mt-2 text-sm text-muted-foreground" role="status">
          <p>
            {summary.unavailableReason ||
              (!summary.enabled
                ? "Meeting summaries are not configured."
                : "Meeting summary processing is temporarily unavailable. Please try again shortly.")}
          </p>
          {summary.enabled && unavailable && (
            <MeetingButton
              tone="secondary"
              className="mt-2"
              onClick={() => void state.refresh()}
            >
              Check availability
            </MeetingButton>
          )}
        </div>
      )}
      {running && (
        <p
          className="mt-2 text-sm text-muted-foreground"
          role="status"
          aria-live="polite"
        >
          {labels[summary.stage ?? "QUEUED"]}
          {summary.stage === "TRANSCRIBING" &&
            !!summary.transcribedChunks &&
            ` Processed ${summary.transcribedChunks} segments.`}
        </p>
      )}
      {summary.status === "COMPLETED" && (
        <>
          <p className="mt-2 text-xs text-muted-foreground">
            AI-generated summary. Check decisions and action items against the
            recording. Timestamps are approximate; speakers are not identified
            from mixed audio.
          </p>
          <div className="mt-3 max-h-64 overflow-y-auto whitespace-pre-wrap text-sm leading-relaxed">
            {summary.content}
          </div>
        </>
      )}
      {summary.status === "FAILED" && (
        <p className="mt-2 text-sm text-destructive" role="alert">
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
        summary.status !== "COMPLETED" && (
          <>
            <p className="mt-2 text-sm text-muted-foreground">
              Audio is transcribed by the local speech service. The transcript
              is sent to the configured AI provider for summarization. Provider
              charges may apply.
            </p>
            <MeetingButton
              className="mt-3"
              disabled={state.creating}
              onClick={state.create}
            >
              {state.creating
                ? "Requesting summary..."
                : summary.status === "FAILED"
                  ? "Retry summary"
                  : "Summarize with AI"}
            </MeetingButton>
          </>
        )}
      {!unavailable &&
        !summary.unavailableReason &&
        !summary.canCreate &&
        summary.status === "NOT_CREATED" && (
          <p className="mt-2 text-sm text-muted-foreground">
            Only the recording owner can generate a summary.
          </p>
        )}
      {state.createError && (
        <p className="mt-2 text-sm text-destructive" role="alert">
          Unable to start the summary. Try again later.
        </p>
      )}
    </section>
  );
}
