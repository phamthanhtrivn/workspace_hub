"use client";

import { FormEvent, useState } from "react";
import { KeyRound, Loader2, LockKeyhole } from "lucide-react";
import { useAppIntl } from "@/features/i18n/useAppIntl";
import { MeetingFullscreenPortal } from "./meeting-fullscreen-overlay";

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
  const intl = useAppIntl();
  const [password, setPassword] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);
  const shownError = localError ?? errorMessage;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedPassword = password.trim();
    if (!normalizedPassword) {
      setLocalError(intl.formatMessage({ id: "meeting.password.required" }));
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
              {intl.formatMessage({ id: "meeting.password.title" })}
            </h1>
            <p className="mt-2 text-sm font-semibold leading-6 text-slate-300">
              {meetingTitle ||
                intl.formatMessage({ id: "meeting.schedule.title" })}
            </p>
          </div>

          <label
            htmlFor="meeting-room-password"
            className="mt-6 block text-xs font-black uppercase tracking-wide text-slate-300"
          >
            {intl.formatMessage({ id: "meeting.password.label" })}
          </label>
          <div className="mt-2 flex h-12 items-center gap-2 rounded-lg border border-white/10 bg-white px-3 text-[#172B4D] shadow-sm focus-within:border-blue-300 focus-within:ring-2 focus-within:ring-blue-300/35">
            <KeyRound className="h-5 w-5 shrink-0 text-slate-400" />
            <input
              id="meeting-room-password"
              type="password"
              autoFocus
              value={password}
              onChange={(event) => {
                setPassword(event.target.value);
                setLocalError(null);
              }}
              placeholder={intl.formatMessage({
                id: "meeting.password.placeholder",
              })}
              className="min-w-0 flex-1 bg-transparent text-sm font-bold outline-none placeholder:text-slate-400"
            />
          </div>

          {shownError ? (
            <p className="mt-2 text-sm font-bold text-red-200">{shownError}</p>
          ) : (
            <p className="mt-2 text-sm font-semibold leading-6 text-slate-400">
              {intl.formatMessage({ id: "meeting.password.description" })}
            </p>
          )}

          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row">
            <button
              type="button"
              onClick={onBack}
              className="h-11 flex-1 cursor-pointer rounded-lg px-5 text-sm font-black text-slate-200 transition hover:bg-white/10"
            >
              {intl.formatMessage({ id: "meeting.room.backToMeetings" })}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex h-11 flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg bg-white px-5 text-sm font-black text-[#172B4D] transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {intl.formatMessage({ id: "meeting.password.continue" })}
            </button>
          </div>
        </form>
      </div>
    </MeetingFullscreenPortal>
  );
}
