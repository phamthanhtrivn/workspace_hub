"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ExternalLink, Link as LinkIcon, X } from "lucide-react";
import { useAppIntl } from "@/features/i18n/useAppIntl";
import { cn } from "@/lib/utils";
import { MEETING_ROUTES } from "../../types/meeting.constants";
import { parseMeetingJoinToken } from "../../utils/meeting-join-link.utils";

interface MeetingJoinLinkModalProps {
  open: boolean;
  onClose: () => void;
  onOpenFailed: () => void;
}

export function MeetingJoinLinkModal({
  open,
  onClose,
  onOpenFailed,
}: MeetingJoinLinkModalProps) {
  const intl = useAppIntl();
  const inputRef = useRef<HTMLInputElement>(null);
  const [mounted, setMounted] = useState(false);
  const [meetingLink, setMeetingLink] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    if (!open) return;

    setMeetingLink("");
    setError(null);
    window.setTimeout(() => inputRef.current?.focus(), 0);
  }, [open]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const joinToken = parseMeetingJoinToken(
      meetingLink,
      window.location.origin,
    );

    if (!joinToken) {
      setError(intl.formatMessage({ id: "meeting.joinModal.invalidLink" }));
      return;
    }

    const meetingWindow = window.open(MEETING_ROUTES.room(joinToken), "_blank");

    if (!meetingWindow) {
      onOpenFailed();
      return;
    }

    meetingWindow.opener = null;
    onClose();
  };

  if (!open || !mounted) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="meeting-join-link-modal-title"
      aria-describedby="meeting-join-link-modal-description"
      className="fixed inset-0 z-[120] grid place-items-center bg-black/50 px-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="w-full max-w-md rounded-lg border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4">
          <div className="min-w-0">
            <h2
              id="meeting-join-link-modal-title"
              className="text-base font-black text-[#172B4D]"
            >
              {intl.formatMessage({ id: "meeting.joinModal.title" })}
            </h2>
            <p
              id="meeting-join-link-modal-description"
              className="mt-1 text-sm font-semibold leading-6 text-slate-500"
            >
              {intl.formatMessage({ id: "meeting.joinModal.description" })}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-9 w-9 shrink-0 cursor-pointer place-items-center rounded-md text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0052CC]"
            aria-label={intl.formatMessage({ id: "app.close" })}
            title={intl.formatMessage({ id: "app.close" })}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-5 py-5">
          <label
            htmlFor="meeting-join-link"
            className="text-xs font-black uppercase text-slate-500"
          >
            {intl.formatMessage({ id: "meeting.joinModal.linkLabel" })}
          </label>
          <div
            className={cn(
              "mt-2 flex min-w-0 items-center gap-2 rounded-lg border bg-slate-50 px-3 py-2.5 transition focus-within:bg-white focus-within:ring-2",
              error
                ? "border-red-300 focus-within:ring-red-100"
                : "border-slate-200 focus-within:border-[#0052CC] focus-within:ring-blue-100",
            )}
          >
            <LinkIcon className="h-4 w-4 shrink-0 text-slate-400" />
            <input
              id="meeting-join-link"
              ref={inputRef}
              type="text"
              value={meetingLink}
              onChange={(event) => {
                setMeetingLink(event.target.value);
                if (error) setError(null);
              }}
              placeholder={intl.formatMessage({
                id: "meeting.joinModal.placeholder",
              })}
              className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-[#172B4D] outline-none placeholder:text-slate-400"
            />
          </div>
          {error ? (
            <p className="mt-2 text-sm font-semibold text-red-600">{error}</p>
          ) : null}

          <div className="mt-5 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="h-10 cursor-pointer rounded-lg bg-slate-100 px-4 text-sm font-black text-slate-600 transition hover:bg-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
            >
              {intl.formatMessage({ id: "app.cancel" })}
            </button>
            <button
              type="submit"
              className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-lg bg-[#0052CC] px-4 text-sm font-black text-white transition hover:bg-[#0C66E4] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0052CC] focus-visible:ring-offset-2"
            >
              <ExternalLink className="h-4 w-4" />
              {intl.formatMessage({ id: "meeting.joinModal.join" })}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}
