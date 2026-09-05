"use client";

import { useCallback, useState } from "react";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Search,
  X,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAppIntl } from "@/features/i18n/useAppIntl";
import { AvatarFallback } from "@/features/meeting/components/common/avatar-fallback";
import {
  useMeetingJoinRequestActions,
  useMeetingJoinRequests,
} from "@/features/meeting/hooks/useMeetingAdmission";
import { useMeetingSocket } from "@/features/meeting/hooks/useMeetingSocket";
import { meetingKeys } from "@/features/meeting/types/meeting.query-keys";
import type { MeetingJoinRequestUpdatedPayload } from "@/features/meeting/types/meeting-socket.types";

interface MeetingRoomAdmissionPanelProps {
  joinToken: string;
  meetingId: string;
}

export function MeetingRoomAdmissionPanel({
  joinToken,
  meetingId,
}: MeetingRoomAdmissionPanelProps) {
  const intl = useAppIntl();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const requestsQuery = useMeetingJoinRequests({
    joinToken,
    search,
    page,
    enabled: true,
  });
  const actions = useMeetingJoinRequestActions(joinToken);
  const requests = requestsQuery.data?.data;
  const items = requests?.items ?? [];
  const hasRequests = items.length > 0;
  const totalPages = requests?.totalPages ?? 1;
  const shouldShowPagination = hasRequests && totalPages > 1;
  const invalidateRequests = useCallback(() => {
    queryClient.invalidateQueries({
      queryKey: meetingKeys.joinRequestsRoot(joinToken),
    });
  }, [joinToken, queryClient]);

  useMeetingSocket({
    meetingId,
    onJoinRequestChanged: useCallback(
      (payload: MeetingJoinRequestUpdatedPayload) => {
        if (payload.meetingId === meetingId) {
          invalidateRequests();
        }
      },
      [invalidateRequests, meetingId],
    ),
  });

  return (
    <div className="mt-4 flex min-h-0 flex-1 flex-col gap-3">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setPage(1);
          }}
          placeholder={intl.formatMessage({ id: "meeting.admission.search" })}
          className="h-10 w-full rounded-lg border border-white/10 bg-white/8 pl-9 pr-3 text-sm font-semibold text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-blue-300/50 focus:bg-white/10"
        />
      </div>

      {hasRequests ? (
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={actions.approveAll.isPending}
            onClick={() => actions.approveAll.mutate()}
            className="flex h-9 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-lg bg-emerald-500 px-3 text-xs font-black text-white transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Check className="h-3.5 w-3.5" />
            {intl.formatMessage({ id: "meeting.admission.acceptAll" })}
          </button>
          <button
            type="button"
            disabled={actions.declineAll.isPending}
            onClick={() => actions.declineAll.mutate()}
            className="flex h-9 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-lg bg-red-600 px-3 text-xs font-black text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <X className="h-3.5 w-3.5" />
            {intl.formatMessage({ id: "meeting.admission.declineAll" })}
          </button>
        </div>
      ) : null}

      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
        {requestsQuery.isLoading ? (
          <div className="flex h-40 items-center justify-center text-sm font-bold text-slate-400">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {intl.formatMessage({ id: "meeting.admission.loading" })}
          </div>
        ) : !hasRequests ? (
          <div className="rounded-lg bg-white/6 p-4 text-center text-sm font-semibold leading-6 text-slate-400 ring-1 ring-white/8">
            {intl.formatMessage({ id: "meeting.admission.empty" })}
          </div>
        ) : (
          items.map((request) => {
            const displayName =
              request.profile?.fullName ||
              request.profile?.email ||
              request.userId;
            const isBusy =
              actions.approveOne.isPending || actions.declineOne.isPending;

            return (
              <article
                key={request.id}
                className="rounded-lg bg-white/6 p-3 ring-1 ring-white/8"
              >
                <div className="flex items-center gap-3">
                  {request.profile?.avatarUrl ? (
                    <span
                      aria-label={displayName}
                      role="img"
                      className="h-10 w-10 shrink-0 rounded-full bg-cover bg-center"
                      style={{
                        backgroundImage: `url("${request.profile.avatarUrl}")`,
                      }}
                    />
                  ) : (
                    <AvatarFallback
                      label={displayName}
                      className="h-10 w-10 bg-slate-200"
                      iconClassName="h-5 w-5 text-slate-400"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-black text-slate-100">
                      {displayName}
                    </p>
                    <p className="truncate text-xs font-semibold text-slate-400">
                      {request.profile?.email || request.userId}
                    </p>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => actions.approveOne.mutate(request.userId)}
                    className="flex h-8 cursor-pointer items-center justify-center gap-1 rounded-md bg-emerald-500 text-xs font-black text-white transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Check className="h-3.5 w-3.5" />
                    {intl.formatMessage({ id: "meeting.admission.accept" })}
                  </button>
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => actions.declineOne.mutate(request.userId)}
                    className="flex h-8 cursor-pointer items-center justify-center gap-1 rounded-md bg-white/10 text-xs font-black text-slate-200 transition hover:bg-red-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <X className="h-3.5 w-3.5" />
                    {intl.formatMessage({ id: "meeting.admission.decline" })}
                  </button>
                </div>
              </article>
            );
          })
        )}
      </div>

      {shouldShowPagination ? (
        <div className="mt-auto flex items-center justify-between gap-2 rounded-lg bg-white/6 px-2 py-2 text-xs font-black text-slate-300 ring-1 ring-white/8">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((current) => Math.max(1, current - 1))}
            className="grid h-8 w-8 cursor-pointer place-items-center rounded-md transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
            aria-label={intl.formatMessage({ id: "app.previous" })}
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span>
            {page} / {totalPages}
          </span>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() =>
              setPage((current) => Math.min(totalPages, current + 1))
            }
            className="grid h-8 w-8 cursor-pointer place-items-center rounded-md transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
            aria-label={intl.formatMessage({ id: "app.next" })}
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      ) : null}
    </div>
  );
}
