"use client";

import Link from "next/link";
import { Check, Copy, ExternalLink, Lock, Unlock } from "lucide-react";
import { useState } from "react";
import { useAppIntl } from "@/features/i18n/useAppIntl";
import { useUpdateMeetingAccessMutation } from "../hooks/useMeetingQueries";
import { meetingRoutes } from "../types/meeting.constants";
import { MeetingResponse } from "../types/meeting.types";
import { resolveMeetingJoinUrl } from "../utils/meeting.utils";

interface MeetingCardProps {
  meeting: MeetingResponse;
  isHost: boolean;
  onSelectRequests: (meetingId: string) => void;
}

export function MeetingCard({
  meeting,
  isHost,
  onSelectRequests,
}: MeetingCardProps) {
  const intl = useAppIntl();
  const [copied, setCopied] = useState(false);
  const updateAccess = useUpdateMeetingAccessMutation(meeting.id);
  const joinPath = meetingRoutes.joinPath(meeting.joinToken);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(resolveMeetingJoinUrl(meeting));
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  const handleAccessChange = (checked: boolean) => {
    updateAccess.mutate({ allowJoinWithoutApproval: checked });
  };

  return (
    <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-base font-bold text-slate-900">
              {intl.formatMessage({ id: "meeting.instantMeetingName" })}
            </h3>
            <span className="rounded-md bg-emerald-50 px-2 py-1 text-xs font-bold text-emerald-700">
              {intl.formatMessage({ id: "meeting.live" })}
            </span>
          </div>
          <p className="mt-1 text-xs font-medium text-slate-500">
            {intl.formatMessage(
              { id: "meeting.createdAt" },
              { date: new Date(meeting.createdAt).toLocaleString() },
            )}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={handleCopy}
            className="grid h-9 w-9 place-items-center rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label={intl.formatMessage({ id: "meeting.copyJoinLink" })}
          >
            {copied ? (
              <Check className="h-4 w-4 text-emerald-600" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </button>
          <Link
            href={joinPath}
            className="grid h-9 w-9 place-items-center rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label={intl.formatMessage({ id: "meeting.openMeeting" })}
          >
            <ExternalLink className="h-4 w-4" />
          </Link>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
          {meeting.allowJoinWithoutApproval ? (
            <Unlock className="h-4 w-4 text-emerald-600" />
          ) : (
            <Lock className="h-4 w-4 text-amber-600" />
          )}
          <span>
            {intl.formatMessage({
              id: meeting.allowJoinWithoutApproval
                ? "meeting.openAccess"
                : "meeting.approvalRequired",
            })}
          </span>
        </div>

        {isHost ? (
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-600">
              <input
                type="checkbox"
                checked={meeting.allowJoinWithoutApproval}
                onChange={(event) => handleAccessChange(event.target.checked)}
                disabled={updateAccess.isPending}
                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              {intl.formatMessage({ id: "meeting.allowWithoutApprovalShort" })}
            </label>
            <button
              type="button"
              onClick={() => onSelectRequests(meeting.id)}
              className="h-8 rounded-md border border-slate-200 px-3 text-xs font-bold text-slate-700 hover:bg-slate-50"
            >
              {intl.formatMessage(
                { id: "meeting.pendingRequests" },
                { count: meeting.pendingJoinRequestCount ?? 0 },
              )}
            </button>
          </div>
        ) : null}
      </div>
    </article>
  );
}
