"use client";

import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { MeetingAlertDialog } from "@/features/meeting/components/common/meeting-alert-dialog";
import { MeetingParticipantListItem } from "@/features/meeting/components/common/meeting-participant-list-item";
import { useMeetingParticipantsPanel } from "@/features/meeting/hooks/useMeetingParticipantsPanel";
import type { MeetingParticipantRole } from "@/features/meeting/types/meeting.types";
import { MeetingInput } from "@/features/meeting/components/ui/meeting-form-controls";
import { MeetingIconButton } from "@/features/meeting/components/ui/meeting-icon-button";
import { MeetingRoomShareLink } from "./meeting-room-share-link";
import { Spinner } from "@/components/ui/spinner";

interface MeetingParticipantsPanelProps {
  joinToken: string;
  participantRole: MeetingParticipantRole;
  activeScreenShareUserId: string | null;
  mutedParticipantIds: ReadonlySet<string>;
  pinnedParticipantId: string | null;
  isParticipantViewPreferencePending: (participantId: string) => boolean;
  onToggleParticipantAudioMute: (participantId: string) => void;
  onToggleParticipantPin: (participantId: string) => void;
}

export function MeetingParticipantsPanel({
  joinToken,
  participantRole,
  activeScreenShareUserId,
  mutedParticipantIds,
  pinnedParticipantId,
  isParticipantViewPreferencePending,
  onToggleParticipantAudioMute,
  onToggleParticipantPin,
}: MeetingParticipantsPanelProps) {
  const {
    search,
    page,
    totalPages,
    participants,
    participantsQuery,
    hasParticipants,
    shouldShowPagination,
    isBusy,
    setPage,
    setSearch,
    handleRemove,
    handleRoleChange,
    handleStopScreenShare,
    handleLowerHand,
    handleRecordingPermission,
    alertDialogProps,
  } = useMeetingParticipantsPanel({
    joinToken,
    participantRole,
    activeScreenShareUserId,
  });

  return (
    <>
      <div className="mt-4 flex min-h-0 flex-1 flex-col gap-3">
        <MeetingInput
          icon={Search}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search by name or email..."
          containerClassName="border-border bg-accent focus-within:border-border focus-within:ring-border/10"
          className="text-muted-foreground placeholder:text-muted-foreground"
        />

        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
          {participantsQuery.isLoading ? (
            <div role="status" className="flex h-40 items-center justify-center text-sm font-semibold text-muted-foreground">
              <Spinner className="mr-2" />
              Loading participants...
            </div>
          ) : !hasParticipants ? (
            <div className="rounded-lg bg-accent p-4 text-center text-sm font-semibold leading-6 text-muted-foreground ring-1 ring-border/8">
              No participants in the room.
            </div>
          ) : (
            participants.map((participant) => (
              <MeetingParticipantListItem
                key={participant.participant.id}
                item={participant}
                isBusy={isBusy}
                isAudioMutedForMe={mutedParticipantIds.has(
                  participant.participant.userId,
                )}
                isPinnedForMe={
                  pinnedParticipantId === participant.participant.userId
                }
                isPreferencePending={isParticipantViewPreferencePending(
                  participant.participant.userId,
                )}
                onRemove={handleRemove}
                onRoleChange={handleRoleChange}
                onStopScreenShare={handleStopScreenShare}
                onLowerHand={handleLowerHand}
                onRecordingPermission={handleRecordingPermission}
                onToggleAudioMute={onToggleParticipantAudioMute}
                onTogglePin={onToggleParticipantPin}
              />
            ))
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
        <div className="shrink-0">
          <MeetingRoomShareLink joinToken={joinToken} />
        </div>
      </div>
      <MeetingAlertDialog {...alertDialogProps} />
    </>
  );
}
