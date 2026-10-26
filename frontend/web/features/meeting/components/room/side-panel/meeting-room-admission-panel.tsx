"use client";

import { useCallback, useState } from "react";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Search,
  X,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { AvatarFallback } from "@/features/meeting/components/common/avatar-fallback";
import {
  useMeetingJoinRequestActions,
  useMeetingJoinRequests,
} from "@/features/meeting/hooks/useMeetingAdmission";
import { useMeetingSocket } from "@/features/meeting/hooks/useMeetingSocket";
import { meetingKeys } from "@/features/meeting/types/meeting.query-keys";
import type { MeetingJoinRequestUpdatedPayload } from "@/features/meeting/types/meeting-socket.types";
import { MeetingButton, MeetingInput } from "@/features/meeting/components/ui/meeting-form-controls";
import { MeetingIconButton } from "@/features/meeting/components/ui/meeting-icon-button";
import { Spinner } from "@/components/ui/spinner";

interface MeetingRoomAdmissionPanelProps {
  joinToken: string;
  meetingId: string;
}

export function MeetingRoomAdmissionPanel({
  joinToken,
  meetingId,
}: MeetingRoomAdmissionPanelProps) {
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
      <MeetingInput
        icon={Search}
        value={search}
        onChange={(event) => {
          setSearch(event.target.value);
          setPage(1);
        }}
        placeholder="Search by name or email..."
        containerClassName="border-input bg-accent focus-within:border-input focus-within:ring-ring"
        className="text-muted-foreground placeholder:text-muted-foreground"
      />

      {hasRequests ? (
        <div className="flex items-center gap-2">
          <MeetingButton loading={actions.approveAll.isPending}
            type="button"
            tone="primary"
            controlSize="sm"
            disabled={actions.approveAll.isPending}
            onClick={() => actions.approveAll.mutate()}
            className="flex-1 bg-success text-success-foreground hover:bg-success hover:text-success-foreground"
          >
            <Check className="h-3.5 w-3.5" />
            Accept all
          </MeetingButton>
          <MeetingButton loading={actions.declineAll.isPending}
            type="button"
            tone="danger"
            controlSize="sm"
            disabled={actions.declineAll.isPending}
            onClick={() => actions.declineAll.mutate()}
            className="flex-1"
          >
            <X className="h-3.5 w-3.5" />
            Decline all
          </MeetingButton>
        </div>
      ) : null}

      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
        {requestsQuery.isLoading ? (
          <div role="status" className="flex h-40 items-center justify-center text-sm font-semibold text-muted-foreground">
            <Spinner className="mr-2" />
            Loading requests...
          </div>
        ) : !hasRequests ? (
          <div className="rounded-lg bg-accent p-4 text-center text-sm font-semibold leading-6 text-muted-foreground ring-1 ring-border/8">
            No pending requests.
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
                className="rounded-lg bg-accent p-3 ring-1 ring-border/8"
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
                      className="h-10 w-10 bg-accent"
                      iconClassName="h-5 w-5 text-muted-foreground"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-muted-foreground">
                      {displayName}
                    </p>
                    <p className="truncate text-xs font-semibold text-muted-foreground">
                      {request.profile?.email || request.userId}
                    </p>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <MeetingButton loading={actions.approveOne.isPending && actions.approveOne.variables === request.userId}
                    type="button"
                    tone="primary"
                    controlSize="sm"
                    disabled={isBusy}
                    onClick={() => actions.approveOne.mutate(request.userId)}
                    className="bg-success text-success-foreground hover:bg-success hover:text-success-foreground"
                  >
                    <Check className="h-3.5 w-3.5" />
                    Accept
                  </MeetingButton>
                  <MeetingButton loading={actions.declineOne.isPending && actions.declineOne.variables === request.userId}
                    type="button"
                    tone="ghost"
                    controlSize="sm"
                    disabled={isBusy}
                    onClick={() => actions.declineOne.mutate(request.userId)}
                    className="bg-accent text-muted-foreground hover:bg-destructive hover:text-destructive-foreground"
                  >
                    <X className="h-3.5 w-3.5" />
                    Decline
                  </MeetingButton>
                </div>
              </article>
            );
          })
        )}
      </div>

      {shouldShowPagination ? (
        <div className="mt-auto flex items-center justify-between gap-2 rounded-lg bg-accent px-2 py-2 text-xs font-semibold text-muted-foreground ring-1 ring-border/8">
          <MeetingIconButton
            label="Previous"
            icon={ChevronLeft}
            disabled={page <= 1}
            onClick={() => setPage((current) => Math.max(1, current - 1))}
            className="size-8 text-muted-foreground hover:bg-accent"
          />
          <span>
            {page} / {totalPages}
          </span>
          <MeetingIconButton
            label="Next"
            icon={ChevronRight}
            disabled={page >= totalPages}
            onClick={() =>
              setPage((current) => Math.min(totalPages, current + 1))
            }
            className="size-8 text-muted-foreground hover:bg-accent"
          />
        </div>
      ) : null}
    </div>
  );
}
