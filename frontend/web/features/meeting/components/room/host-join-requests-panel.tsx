import { Check, Loader2, UserRoundPlus, X } from "lucide-react";
import Image from "next/image";
import { useAppIntl } from "@/features/i18n/useAppIntl";
import {
  useApproveMeetingJoinRequestMutation,
  useMeetingJoinRequestsQuery,
  useRejectMeetingJoinRequestMutation,
} from "../../hooks/queries/use-meeting-queries";
import { MeetingResponse, UserProfileSnapshot } from "../../types/meeting.types";
import { buildParticipantInitials } from "./meeting-room.utils";

interface HostJoinRequestsPanelProps {
  meeting: MeetingResponse;
  onClose: () => void;
}

export function HostJoinRequestsPanel({
  meeting,
  onClose,
}: HostJoinRequestsPanelProps) {
  const intl = useAppIntl();
  const requestsQuery = useMeetingJoinRequestsQuery(meeting.id, true);
  const approveRequest = useApproveMeetingJoinRequestMutation(meeting.id);
  const rejectRequest = useRejectMeetingJoinRequestMutation(meeting.id);
  const requests = requestsQuery.data?.data ?? [];

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
              {requests.length}
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
              const initials = buildParticipantInitials(displayName);
              const isBusy =
                approveRequest.isPending || rejectRequest.isPending;
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
                    <div
                      className="relative grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full bg-blue-600 text-sm font-black text-white"
                      aria-label={displayName}
                    >
                      {profile?.avatarUrl ? (
                        <Image
                          src={profile.avatarUrl}
                          alt={displayName}
                          fill
                          sizes="40px"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        initials
                      )}
                    </div>
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
                      onClick={() => approveRequest.mutate(participant.userId)}
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
                      onClick={() => rejectRequest.mutate(participant.userId)}
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
