import { Copy, Link2, Loader2, Settings } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useAppIntl } from "@/features/i18n/useAppIntl";
import { useUpdateMeetingAccessMutation } from "../../../hooks/queries/use-meeting-queries";
import { MeetingResponse } from "../../../types/meeting.types";
import { resolveMeetingJoinUrl } from "../../../utils/meeting.utils";

interface MeetingSettingsMenuProps {
  canModerate: boolean;
  joinToken: string;
  meeting: MeetingResponse;
  settingsError: string | null;
  onSettingsErrorChange: (message: string | null) => void;
}

export function MeetingSettingsMenu({
  canModerate,
  joinToken,
  meeting,
  settingsError,
  onSettingsErrorChange,
}: MeetingSettingsMenuProps) {
  const intl = useAppIntl();
  const settingsRef = useRef<HTMLDivElement | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [hasCopiedLink, setHasCopiedLink] = useState(false);
  const updateAccess = useUpdateMeetingAccessMutation(meeting.id, joinToken);
  const joinUrl = resolveCurrentMeetingUrl(meeting);
  const allowJoinWithoutApproval =
    updateAccess.data?.data.allowJoinWithoutApproval ??
    meeting.allowJoinWithoutApproval;

  useEffect(() => {
    if (!isSettingsOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!settingsRef.current?.contains(event.target as Node)) {
        setIsSettingsOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [isSettingsOpen]);

  const handleCopyJoinLink = async () => {
    onSettingsErrorChange(null);
    try {
      await copyTextToClipboard(joinUrl);
      setHasCopiedLink(true);
      window.setTimeout(() => setHasCopiedLink(false), 1800);
    } catch {
      onSettingsErrorChange(
        intl.formatMessage({ id: "meeting.room.copyLinkFailed" }),
      );
    }
  };

  const handleAccessChange = (allowNextJoinWithoutApproval: boolean) => {
    onSettingsErrorChange(null);
    updateAccess.mutate(
      { allowJoinWithoutApproval: allowNextJoinWithoutApproval },
      {
        onError: () =>
          onSettingsErrorChange(
            intl.formatMessage({ id: "meeting.room.accessUpdateFailed" }),
          ),
      },
    );
  };

  return (
    <div className="relative" ref={settingsRef}>
      <button
        type="button"
        onClick={() => setIsSettingsOpen((value) => !value)}
        className="grid h-10 w-10 place-items-center rounded-lg bg-white/10 text-white hover:bg-white/10"
        aria-expanded={isSettingsOpen}
        aria-label={intl.formatMessage({ id: "meeting.room.settings" })}
      >
        <Settings className="h-4 w-4" />
      </button>

      {isSettingsOpen ? (
        <div className="absolute bottom-12 right-0 z-10 w-[min(22rem,calc(100vw-2rem))] rounded-lg border border-white/10 bg-[#111827] p-4 text-left shadow-2xl">
          <div className="flex items-center gap-2 text-sm font-black text-white">
            <Settings className="h-4 w-4 text-blue-300" />
            {intl.formatMessage({ id: "meeting.room.meetingSettings" })}
          </div>

          <div className="mt-4 space-y-2">
            <label className="text-xs font-bold uppercase text-slate-400">
              {intl.formatMessage({ id: "meeting.room.joinLink" })}
            </label>
            <div className="flex overflow-hidden rounded-md border border-white/10 bg-black/20">
              <div className="flex min-w-0 flex-1 items-center gap-2 px-3 text-xs font-semibold text-slate-200">
                <Link2 className="h-4 w-4 shrink-0 text-blue-300" />
                <span className="truncate">{joinUrl}</span>
              </div>
              <button
                type="button"
                onClick={handleCopyJoinLink}
                className="grid h-10 w-10 shrink-0 place-items-center border-l border-white/10 text-white hover:bg-white/10"
                aria-label={intl.formatMessage({
                  id: "meeting.room.copyJoinLink",
                })}
              >
                <Copy className="h-4 w-4" />
              </button>
            </div>
            <p className="text-xs font-semibold text-slate-400">
              {hasCopiedLink
                ? intl.formatMessage({ id: "meeting.room.linkCopied" })
                : intl.formatMessage({ id: "meeting.room.copyJoinLinkHelp" })}
            </p>
          </div>

          {canModerate ? (
            <div className="mt-4 rounded-md border border-white/10 bg-white/[0.04] p-3">
              <label className="flex cursor-pointer items-start justify-between gap-3">
                <span className="block text-sm font-bold text-white">
                  {intl.formatMessage({
                    id: "meeting.room.allowWithoutApproval",
                  })}
                </span>
                <input
                  type="checkbox"
                  checked={allowJoinWithoutApproval}
                  disabled={updateAccess.isPending}
                  onChange={(event) => handleAccessChange(event.target.checked)}
                  className="h-5 w-5 accent-blue-500"
                />
              </label>
              {updateAccess.isPending ? (
                <p className="mt-2 flex items-center gap-2 text-xs font-bold text-blue-200">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  {intl.formatMessage({ id: "meeting.room.updatingAccess" })}
                </p>
              ) : null}
            </div>
          ) : null}

          {settingsError ? (
            <p className="mt-3 text-xs font-bold text-red-300">
              {settingsError}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

async function copyTextToClipboard(text: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textArea = document.createElement("textarea");
  textArea.value = text;
  textArea.style.position = "fixed";
  textArea.style.opacity = "0";
  document.body.append(textArea);
  textArea.select();
  document.execCommand("copy");
  textArea.remove();
}

function resolveCurrentMeetingUrl(meeting: MeetingResponse) {
  if (typeof window !== "undefined") {
    return window.location.href;
  }

  return resolveMeetingJoinUrl(meeting);
}
