"use client";

import { Check, X } from "lucide-react";
import { useAppIntl } from "@/features/i18n/useAppIntl";
import {
  useApproveMeetingJoinRequestMutation,
  useMeetingJoinRequestsQuery,
  useRejectMeetingJoinRequestMutation,
} from "../hooks/useMeetingQueries";

interface JoinRequestsPanelProps {
  meetingId?: string;
  enabled: boolean;
}

export function JoinRequestsPanel({
  meetingId,
  enabled,
}: JoinRequestsPanelProps) {
  const intl = useAppIntl();
  const requestsQuery = useMeetingJoinRequestsQuery(meetingId, enabled);
  const approveRequest = useApproveMeetingJoinRequestMutation(meetingId ?? "");
  const rejectRequest = useRejectMeetingJoinRequestMutation(meetingId ?? "");
  const requests = requestsQuery.data?.data ?? [];

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="border-b border-slate-100 pb-3">
        <h2 className="text-sm font-bold text-slate-900">
          {intl.formatMessage({ id: "meeting.joinRequests" })}
        </h2>
        <p className="mt-1 text-xs font-medium text-slate-500">
          {intl.formatMessage({ id: "meeting.joinRequestsHelp" })}
        </p>
      </div>

      <div className="mt-3 space-y-2">
        {!meetingId ? (
          <p className="text-sm font-medium text-slate-500">
            {intl.formatMessage({ id: "meeting.selectMeetingForRequests" })}
          </p>
        ) : requestsQuery.isLoading ? (
          <p className="text-sm font-medium text-slate-500">
            {intl.formatMessage({ id: "meeting.loadingRequests" })}
          </p>
        ) : requests.length === 0 ? (
          <p className="text-sm font-medium text-slate-500">
            {intl.formatMessage({ id: "meeting.noJoinRequests" })}
          </p>
        ) : (
          requests.map((request) => (
            <div
              key={request.id}
              className="flex items-center justify-between gap-3 rounded-md border border-slate-200 px-3 py-2"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-slate-800">
                  {request.userId}
                </p>
                <p className="text-xs font-medium text-slate-500">
                  {intl.formatMessage({ id: "meeting.waitingApproval" })}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  onClick={() => approveRequest.mutate(request.userId)}
                  className="grid h-8 w-8 place-items-center rounded-md bg-emerald-600 text-white hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  aria-label={intl.formatMessage({
                    id: "meeting.approveRequest",
                  })}
                >
                  <Check className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => rejectRequest.mutate(request.userId)}
                  className="grid h-8 w-8 place-items-center rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  aria-label={intl.formatMessage({
                    id: "meeting.rejectRequest",
                  })}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
