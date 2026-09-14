"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { ExternalLink, Link as LinkIcon, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { MeetingButton, MeetingInput } from "../ui/meeting-form-controls";
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
  const inputRef = useRef<HTMLInputElement>(null);
  const [meetingLink, setMeetingLink] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;

    const resetTimer = window.setTimeout(() => {
      setMeetingLink("");
      setError(null);
      inputRef.current?.focus();
    }, 0);

    return () => window.clearTimeout(resetTimer);
  }, [open]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const joinToken = parseMeetingJoinToken(
      meetingLink,
      window.location.origin,
    );

    if (!joinToken) {
      setError("Enter a valid meeting link or join token.");
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

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent className="max-w-md p-0" showCloseButton={false}>
        <DialogHeader className="flex flex-row items-start justify-between gap-4 border-b border-slate-100 px-5 py-4">
          <div className="min-w-0">
            <DialogTitle
              id="meeting-join-link-modal-title"
              className="text-base font-black text-[#172B4D]"
            >
              Join a meeting
            </DialogTitle>
            <DialogDescription
              id="meeting-join-link-modal-description"
              className="mt-1 text-sm font-semibold leading-6 text-slate-500"
            >
              Paste a meeting link or join token to open it in a new tab.
            </DialogDescription>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-9 w-9 shrink-0 cursor-pointer place-items-center rounded-md text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0052CC]"
            aria-label="Close"
            title="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="px-5 py-5">
          <label
            htmlFor="meeting-join-link"
            className="text-xs font-black uppercase text-slate-500"
          >
            Meeting link
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
            <MeetingInput
              id="meeting-join-link"
              ref={inputRef}
              type="text"
              value={meetingLink}
              onChange={(event) => {
                setMeetingLink(event.target.value);
                if (error) setError(null);
              }}
              placeholder="https://workspacehub.app/meetings/..."
              className="h-auto min-w-0 flex-1 border-0 bg-transparent px-0 py-0 text-sm font-semibold text-[#172B4D] shadow-none outline-none placeholder:text-slate-400 focus-visible:ring-0"
            />
          </div>
          {error ? (
            <p className="mt-2 text-sm font-semibold text-red-600">{error}</p>
          ) : null}

          <div className="mt-5 flex justify-end gap-2">
            <MeetingButton
              type="button"
              tone="secondary"
              onClick={onClose}
              className="cursor-pointer"
            >
              Cancel
            </MeetingButton>
            <MeetingButton
              type="submit"
              className="cursor-pointer"
            >
              <ExternalLink className="h-4 w-4" />
              Join in new tab
            </MeetingButton>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
