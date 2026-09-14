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
      <div className="fixed inset-0 z-[100] flex min-h-[100dvh] items-center justify-center bg-[#07111f] px-4 text-white">
        <form
          onSubmit={handleSubmit}
          className="w-full max-w-md rounded-lg border border-white/10 bg-[#0d1420] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.28)]"
        >
          <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-blue-500/16 text-blue-100 ring-1 ring-blue-300/20">
            <LockKeyhole className="h-8 w-8" />
          </span>

          <div className="mt-5 text-center">
            <h1 className="text-xl font-black">
              Enter meeting password
            </h1>
            <p className="mt-2 text-sm font-semibold leading-6 text-slate-300">
              {meetingTitle || "Schedule a meeting"}
            </p>
          </div>

          <label
            htmlFor="meeting-room-password"
            className="mt-6 block text-xs font-black uppercase tracking-wide text-slate-300"
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
              className="h-12 border-white/10 bg-white font-bold text-[#172B4D]"
            />
          </div>

          {shownError ? (
            <p className="mt-2 text-sm font-bold text-red-200">{shownError}</p>
          ) : (
            <p className="mt-2 text-sm font-semibold leading-6 text-slate-400">
              This meeting requires a password before you can continue.
            </p>
          )}

          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row">
            <MeetingButton
              type="button"
              tone="ghost"
              controlSize="lg"
              onClick={onBack}
              className="flex-1 text-slate-200 hover:bg-white/10 hover:text-white"
            >
              Back to meetings
            </MeetingButton>
            <MeetingButton
              type="submit"
              tone="secondary"
              controlSize="lg"
              disabled={isSubmitting}
              className="flex-1 bg-white font-black text-[#172B4D] hover:bg-slate-100"
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
