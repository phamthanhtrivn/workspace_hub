import { Check, Loader2, Search, UserRoundPlus, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useAppIntl } from "@/features/i18n/useAppIntl";
import {
  useApproveAllMeetingJoinRequestsMutation,
  useApproveMeetingJoinRequestMutation,
  useMeetingJoinRequestsQuery,
  useRejectMeetingJoinRequestMutation,
} from "../../hooks/queries/use-meeting-queries";
import { MeetingResponse, UserProfileSnapshot } from "../../types/meeting.types";
import { MeetingParticipantAvatar } from "./participants/meeting-participant-tile";

interface HostJoinRequestsPanelProps {
  meeting: MeetingResponse;
  onClose: () => void;
}

const JOIN_REQUESTS_PAGE_SIZE = 10;

export function HostJoinRequestsPanel({
  meeting,
  onClose,
}: HostJoinRequestsPanelProps) {
  const intl = useAppIntl();
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const requestsQuery = useMeetingJoinRequestsQuery(
    meeting.id,
    {
      search: debouncedSearch,
      page,
      limit: JOIN_REQUESTS_PAGE_SIZE,
    },
    true,
  );
  const approveAllRequests = useApproveAllMeetingJoinRequestsMutation(
    meeting.id,
  );
  const approveRequest = useApproveMeetingJoinRequestMutation(meeting.id);
  const rejectRequest = useRejectMeetingJoinRequestMutation(meeting.id);
  const requests = requestsQuery.data?.data.items ?? [];
  const pagination = requestsQuery.data?.data.pagination;
  const totalRequests = pagination?.total ?? requests.length;
  const totalPages = pagination?.totalPages ?? 0;
  const canGoPrevious = page > 1;
  const canGoNext = totalPages > page;
  const isMutating =
    approveRequest.isPending ||
    rejectRequest.isPending ||
    approveAllRequests.isPending;

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setPage(1);
      setDebouncedSearch(searchInput.trim());
    }, 250);

    return () => window.clearTimeout(timeoutId);
  }, [searchInput]);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/55 px-4 py-8"
      onClick={onClose}
      role="presentation"
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="meeting-join-requests-title"
        onClick={(event) => event.stopPropagation()}
        className="flex max-h-[calc(100vh-4rem)] w-[min(28rem,calc(100vw-2rem))] min-h-0 flex-col overflow-hidden rounded-lg border border-white/10 bg-[#0f172a] shadow-2xl"
      >
        <header className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <div
            id="meeting-join-requests-title"
            className="flex items-center gap-2 text-sm font-black text-white"
          >
            <UserRoundPlus className="h-4 w-4 text-blue-300" />
            {intl.formatMessage({ id: "meeting.room.joinRequests" })}
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-white/10 px-2 py-1 text-xs font-bold text-slate-200">
              {totalRequests}
            </span>
            <button
              type="button"
              onClick={onClose}
              className="grid h-8 w-8 place-items-center rounded-md text-slate-300 hover:bg-white/10 hover:text-white"
              aria-label={intl.formatMessage({
                id: "meeting.room.closeJoinRequests",
              })}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </header>

        <div className="space-y-3 border-b border-white/10 px-4 py-3">
          <label className="flex h-10 items-center gap-2 rounded-md border border-white/10 bg-white/[0.06] px-3 text-sm text-slate-200">
            <Search className="h-4 w-4 text-slate-400" />
            <input
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder={intl.formatMessage({
                id: "meeting.room.joinRequests.search",
              })}
              className="min-w-0 flex-1 bg-transparent font-semibold outline-none placeholder:text-slate-500"
            />
          </label>
          <button
            type="button"
            disabled={isMutating || totalRequests === 0}
            onClick={() =>
              approveAllRequests.mutate(undefined, {
                onSuccess: () => setPage(1),
              })
            }
            className="flex h-9 w-full items-center justify-center gap-2 rounded-md bg-emerald-500 px-3 text-xs font-black text-white hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {approveAllRequests.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Check className="h-4 w-4" />
            )}
            {intl.formatMessage({
              id: approveAllRequests.isPending
                ? "meeting.approvingAllRequests"
                : "meeting.approveAllRequests",
            })}
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
          {requestsQuery.isLoading ? (
            <div className="grid h-32 place-items-center text-sm font-semibold text-slate-400">
              <Loader2 className="mb-2 h-5 w-5 animate-spin text-blue-300" />
              {intl.formatMessage({ id: "meeting.loadingRequests" })}
            </div>
          ) : requests.length ? (
            requests.map((participant) => {
              const profile = participant.profile ?? null;
              const displayName = resolveRequestDisplayName(
                profile,
                participant.userId,
              );
              const isBusy =
                approveRequest.isPending ||
                rejectRequest.isPending ||
                approveAllRequests.isPending;
              const isApproving =
                approveRequest.isPending &&
                approveRequest.variables === participant.userId;
              const isRejecting =
                rejectRequest.isPending &&
                rejectRequest.variables === participant.userId;

              return (
                <div
                  key={participant.userId}
                  className="rounded-lg border border-white/10 bg-white/[0.04] p-3"
                >
                  <div className="flex items-center gap-3">
                    <MeetingParticipantAvatar
                      avatarUrl={profile?.avatarUrl}
                      displayName={displayName}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-white">
                        {displayName}
                      </p>
                      <p className="truncate text-xs font-semibold text-slate-400">
                        {profile?.email ?? participant.userId}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() =>
                        approveRequest.mutate(participant.userId, {
                          onSuccess: () => {
                            if (requests.length === 1 && page > 1) {
                              setPage((value) => Math.max(1, value - 1));
                            }
                          },
                        })
                      }
                      className="flex h-9 items-center justify-center gap-2 rounded-md bg-emerald-500 px-3 text-xs font-black text-white hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isApproving ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Check className="h-4 w-4" />
                      )}
                      {intl.formatMessage({ id: "meeting.approveRequest" })}
                    </button>
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() =>
                        rejectRequest.mutate(participant.userId, {
                          onSuccess: () => {
                            if (requests.length === 1 && page > 1) {
                              setPage((value) => Math.max(1, value - 1));
                            }
                          },
                        })
                      }
                      className="flex h-9 items-center justify-center gap-2 rounded-md bg-white/10 px-3 text-xs font-black text-white hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isRejecting ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <X className="h-4 w-4" />
                      )}
                      {intl.formatMessage({ id: "meeting.rejectRequest" })}
                    </button>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="grid h-32 place-items-center rounded-lg border border-dashed border-white/15 bg-white/[0.04] px-4 text-center text-sm font-semibold text-slate-400">
              {intl.formatMessage({ id: "meeting.noJoinRequests" })}
            </div>
          )}
        </div>

        <footer className="flex items-center justify-between gap-3 border-t border-white/10 px-4 py-3 text-xs font-bold text-slate-300">
          <span>
            {intl.formatMessage(
              { id: "meeting.pagination.summary" },
              {
                page: totalPages === 0 ? 0 : page,
                totalPages,
                total: totalRequests,
              },
            )}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={!canGoPrevious || requestsQuery.isFetching}
              onClick={() => setPage((value) => Math.max(1, value - 1))}
              className="h-8 rounded-md bg-white/10 px-3 text-slate-100 hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {intl.formatMessage({ id: "app.previous" })}
            </button>
            <button
              type="button"
              disabled={!canGoNext || requestsQuery.isFetching}
              onClick={() => setPage((value) => value + 1)}
              className="h-8 rounded-md bg-white/10 px-3 text-slate-100 hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {intl.formatMessage({ id: "app.next" })}
            </button>
          </div>
        </footer>
      </section>
    </div>
  );
}

function resolveRequestDisplayName(
  profile: UserProfileSnapshot | null,
  userId: string,
) {
  return profile?.fullName || profile?.email || userId;
}
