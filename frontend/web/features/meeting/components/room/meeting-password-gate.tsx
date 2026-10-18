"use client";

import { FormEvent, useState } from "react";
import { KeyRound, Loader2, LockKeyhole } from "lucide-react";
import { MeetingFullscreenPortal } from "./meeting-fullscreen-overlay";
import { MeetingButton, MeetingInput } from "../ui/meeting-form-controls";

interface MeetingPasswordGateProps {
  meetingTitle?: string | null;
  isSubmitting: boolean;
  errorMessage?: string | null;
  onBack: () => void;
  onSubmit: (password: string) => void;
}

export function MeetingPasswordGate({
  meetingTitle,
  isSubmitting,
  errorMessage,
  onBack,
  onSubmit,
}: MeetingPasswordGateProps) {
  const [password, setPassword] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);
  const shownError = localError ?? errorMessage;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedPassword = password.trim();
    if (!normalizedPassword) {
      setLocalError("Enter the meeting password.");
      return;
    }

    setLocalError(null);
    onSubmit(normalizedPassword);
  };

  return (
    <MeetingFullscreenPortal>
      <div className="fixed inset-0 z-[100] flex h-dvh min-h-0 overflow-y-auto py-4 [align-items:safe_center] justify-center bg-card px-4 text-foreground">
        <form
          onSubmit={handleSubmit}
          className="w-full max-w-md rounded-lg border border-border bg-card p-6"
        >
          <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-primary/16 text-info-content ring-1 ring-ring/20">
            <LockKeyhole className="h-8 w-8" />
          </span>

          <div className="mt-5 text-center">
            <h1 className="text-page-title font-semibold">
              Enter meeting password
            </h1>
            <p className="mt-2 text-sm font-semibold leading-6 text-muted-foreground">
              {meetingTitle || "Schedule a meeting"}
            </p>
          </div>

          <label
            htmlFor="meeting-room-password"
            className="mt-6 block text-xs font-semibold uppercase tracking-wide text-muted-foreground"
          >
            Password
          </label>
          <div className="mt-2">
            <MeetingInput
              id="meeting-room-password"
              type="password"
              autoFocus
              icon={KeyRound}
              invalid={Boolean(shownError)}
              value={password}
              onChange={(event) => {
                setPassword(event.target.value);
                setLocalError(null);
              }}
              placeholder="Enter meeting password"
              className="h-12 border-border bg-card font-semibold text-foreground"
            />
          </div>

          {shownError ? (
            <p className="mt-2 text-sm font-semibold text-destructive-content">{shownError}</p>
          ) : (
            <p className="mt-2 text-sm font-semibold leading-6 text-muted-foreground">
              This meeting requires a password before you can continue.
            </p>
          )}

          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row">
            <MeetingButton
              type="button"
              tone="ghost"
              controlSize="lg"
              onClick={onBack}
              className="flex-1 text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              Back to meetings
            </MeetingButton>
            <MeetingButton
              type="submit"
              tone="secondary"
              controlSize="lg"
              disabled={isSubmitting}
              className="flex-1 bg-card font-semibold text-foreground hover:bg-muted"
            >
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Continue
            </MeetingButton>
          </div>
        </form>
      </div>
    </MeetingFullscreenPortal>
  );
}
