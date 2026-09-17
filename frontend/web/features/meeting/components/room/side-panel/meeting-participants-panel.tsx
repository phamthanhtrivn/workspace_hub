"use client";

import { ChevronLeft, ChevronRight, Loader2, Search } from "lucide-react";
import { MeetingAlertDialog } from "@/features/meeting/components/common/meeting-alert-dialog";
import { MeetingParticipantListItem } from "@/features/meeting/components/common/meeting-participant-list-item";
import { useMeetingParticipantsPanel } from "@/features/meeting/hooks/useMeetingParticipantsPanel";
import type { MeetingParticipantRole } from "@/features/meeting/types/meeting.types";
import { MeetingInput } from "@/features/meeting/components/ui/meeting-form-controls";
import { MeetingIconButton } from "@/features/meeting/components/ui/meeting-icon-button";

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
          containerClassName="border-white/10 bg-white/8 focus-within:border-white/20 focus-within:ring-white/10"
          className="text-slate-100 placeholder:text-slate-500"
        />

        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
          {participantsQuery.isLoading ? (
            <div className="flex h-40 items-center justify-center text-sm font-bold text-slate-400">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Loading participants...
            </div>
          ) : !hasParticipants ? (
            <div className="rounded-lg bg-white/6 p-4 text-center text-sm font-semibold leading-6 text-slate-400 ring-1 ring-white/8">
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
                onToggleAudioMute={onToggleParticipantAudioMute}
                onTogglePin={onToggleParticipantPin}
              />
            ))
          )}
        </div>

        {shouldShowPagination ? (
          <div className="mt-auto flex items-center justify-between gap-2 rounded-lg bg-white/6 px-2 py-2 text-xs font-black text-slate-300 ring-1 ring-white/8">
            <MeetingIconButton
              label="Previous"
              icon={ChevronLeft}
              disabled={page <= 1}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              className="size-8 text-slate-300 hover:bg-white/10"
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
              className="size-8 text-slate-300 hover:bg-white/10"
            />
          </div>
        ) : null}
      </div>
      <MeetingAlertDialog {...alertDialogProps} />
    </>
  );
}
