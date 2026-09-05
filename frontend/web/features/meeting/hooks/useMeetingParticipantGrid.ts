"use client";

import { useCallback, useMemo, useState } from "react";
import {
  useParticipants,
  useSpeakingParticipants,
  useTracks,
  useVisualStableUpdate,
  type TrackReferenceOrPlaceholder,
} from "@livekit/components-react";
import { Track } from "livekit-client";
import { cn } from "@/lib/utils";
import { MeetingRoomPanel } from "../types/meeting.types";

const participantPageSize = 16;

enum MeetingParticipantGridVariant {
  SINGLE = "single",
  PAIR = "pair",
  QUAD = "quad",
  GALLERY = "gallery",
}

const fullRoomGridClassNameByVariant: Record<
  MeetingParticipantGridVariant,
  string
> = {
  [MeetingParticipantGridVariant.SINGLE]:
    "grid grid-cols-[minmax(0,min(100%,52rem))] place-content-center justify-center gap-4",
  [MeetingParticipantGridVariant.PAIR]:
    "grid grid-cols-[minmax(0,min(100%,34rem))] place-content-center justify-center gap-4 sm:grid-cols-[repeat(2,minmax(0,34rem))]",
  [MeetingParticipantGridVariant.QUAD]:
    "grid grid-cols-[minmax(0,min(100%,30rem))] place-content-center justify-center gap-4 sm:grid-cols-[repeat(2,minmax(0,30rem))]",
  [MeetingParticipantGridVariant.GALLERY]:
    "grid grid-cols-[minmax(0,min(100%,28rem))] place-content-center justify-center gap-4 sm:grid-cols-[repeat(2,minmax(0,24rem))] lg:grid-cols-[repeat(3,minmax(0,22rem))] xl:grid-cols-[repeat(4,minmax(0,20rem))]",
};

const sidePanelGridClassNameByVariant: Record<
  MeetingParticipantGridVariant,
  string
> = {
  [MeetingParticipantGridVariant.SINGLE]:
    "grid grid-cols-[minmax(0,min(100%,36rem))] place-content-center justify-center gap-4",
  [MeetingParticipantGridVariant.PAIR]:
    "grid grid-cols-[minmax(0,min(100%,26rem))] place-content-center justify-center gap-4 2xl:grid-cols-[repeat(2,minmax(0,24rem))]",
  [MeetingParticipantGridVariant.QUAD]:
    "grid grid-cols-[minmax(0,min(100%,26rem))] place-content-center justify-center gap-4 sm:grid-cols-[repeat(2,minmax(0,24rem))]",
  [MeetingParticipantGridVariant.GALLERY]:
    "grid grid-cols-[minmax(0,min(100%,28rem))] place-content-center justify-center gap-4 sm:grid-cols-[repeat(2,minmax(0,22rem))] 2xl:grid-cols-[repeat(3,minmax(0,20rem))]",
};

const tileFrameClassNameByVariant: Record<MeetingParticipantGridVariant, string> =
  {
    [MeetingParticipantGridVariant.SINGLE]:
      "aspect-video w-full max-h-[min(64dvh,32rem)] [&>article]:!min-h-0 [&>article]:h-full",
    [MeetingParticipantGridVariant.PAIR]:
      "aspect-video w-full max-h-[min(52dvh,26rem)] [&>article]:!min-h-0 [&>article]:h-full",
    [MeetingParticipantGridVariant.QUAD]:
      "aspect-video w-full max-h-[min(42dvh,22rem)] [&>article]:!min-h-0 [&>article]:h-full",
    [MeetingParticipantGridVariant.GALLERY]:
      "aspect-video w-full min-h-[9rem] [&>article]:!min-h-0 [&>article]:h-full",
  };

function sortCameraTracks(
  cameraTracks: TrackReferenceOrPlaceholder[],
  activeSpeakerRanks: Map<string, number>,
  pinnedParticipantId: string | null,
): TrackReferenceOrPlaceholder[] {
  return [...cameraTracks].sort((first, second) => {
    const firstParticipant = first.participant;
    const secondParticipant = second.participant;

    if (firstParticipant.isLocal !== secondParticipant.isLocal) {
      return firstParticipant.isLocal ? -1 : 1;
    }

    const isFirstPinned =
      !firstParticipant.isLocal &&
      firstParticipant.identity === pinnedParticipantId;
    const isSecondPinned =
      !secondParticipant.isLocal &&
      secondParticipant.identity === pinnedParticipantId;

    if (isFirstPinned !== isSecondPinned) {
      return isFirstPinned ? -1 : 1;
    }

    const firstActiveSpeakerRank = activeSpeakerRanks.get(
      firstParticipant.identity,
    );
    const secondActiveSpeakerRank = activeSpeakerRanks.get(
      secondParticipant.identity,
    );
    const isFirstActiveSpeaker =
      firstParticipant.isSpeaking || firstActiveSpeakerRank !== undefined;
    const isSecondActiveSpeaker =
      secondParticipant.isSpeaking || secondActiveSpeakerRank !== undefined;

    if (isFirstActiveSpeaker && isSecondActiveSpeaker) {
      const audioLevelDifference =
        secondParticipant.audioLevel - firstParticipant.audioLevel;

      if (audioLevelDifference !== 0) return audioLevelDifference;

      return (
        (firstActiveSpeakerRank ?? Number.MAX_SAFE_INTEGER) -
        (secondActiveSpeakerRank ?? Number.MAX_SAFE_INTEGER)
      );
    }

    if (isFirstActiveSpeaker !== isSecondActiveSpeaker) {
      return isFirstActiveSpeaker ? -1 : 1;
    }

    const lastSpokeDifference =
      (secondParticipant.lastSpokeAt?.getTime() ?? 0) -
      (firstParticipant.lastSpokeAt?.getTime() ?? 0);

    if (lastSpokeDifference !== 0) return lastSpokeDifference;

    return firstParticipant.identity.localeCompare(
      secondParticipant.identity,
    );
  });
}

function getGridVariant(visibleTileCount: number): MeetingParticipantGridVariant {
  if (visibleTileCount <= 1) return MeetingParticipantGridVariant.SINGLE;
  if (visibleTileCount === 2) return MeetingParticipantGridVariant.PAIR;
  if (visibleTileCount <= 4) return MeetingParticipantGridVariant.QUAD;

  return MeetingParticipantGridVariant.GALLERY;
}

export function useMeetingParticipantGrid(
  activePanel: MeetingRoomPanel,
  pinnedParticipantId: string | null,
) {
  const participants = useParticipants();
  const activeSpeakers = useSpeakingParticipants();
  const cameraTracks = useTracks(
    [{ source: Track.Source.Camera, withPlaceholder: true }],
    { onlySubscribed: false },
  );
  const [currentParticipantPage, setCurrentParticipantPage] = useState(1);

  const activeSpeakerRanks = useMemo(
    () =>
      new Map(
        activeSpeakers.map((participant, index) => [
          participant.identity,
          index,
        ]),
      ),
    [activeSpeakers],
  );
  const sortStableCameraTracks = useCallback(
    (trackReferences: TrackReferenceOrPlaceholder[]) =>
      sortCameraTracks(trackReferences, activeSpeakerRanks, pinnedParticipantId),
    [activeSpeakerRanks, pinnedParticipantId],
  );
  const sortedCameraTracks = useVisualStableUpdate(
    cameraTracks,
    participantPageSize,
    { customSortFunction: sortStableCameraTracks },
  );

  const totalParticipantPages = Math.max(
    1,
    Math.ceil(sortedCameraTracks.length / participantPageSize),
  );
  const safeParticipantPage = Math.min(
    currentParticipantPage,
    totalParticipantPages,
  );

  const visibleCameraTracks = useMemo(() => {
    const startIndex = (safeParticipantPage - 1) * participantPageSize;

    return sortedCameraTracks.slice(
      startIndex,
      startIndex + participantPageSize,
    );
  }, [safeParticipantPage, sortedCameraTracks]);

  const visibleTileCount = visibleCameraTracks.length;
  const gridVariant = getGridVariant(visibleTileCount);

  const canGoPrevious = safeParticipantPage > 1;
  const canGoNext = safeParticipantPage < totalParticipantPages;
  const hasOpenPanel = activePanel !== MeetingRoomPanel.NONE;
  const participantGridClassName = cn(
    hasOpenPanel
      ? sidePanelGridClassNameByVariant[gridVariant]
      : fullRoomGridClassNameByVariant[gridVariant],
  );
  const participantTileFrameClassName = cn(
    tileFrameClassNameByVariant[gridVariant],
  );

  const goToPreviousParticipantPage = () => {
    setCurrentParticipantPage((current) => Math.max(1, current - 1));
  };

  const goToNextParticipantPage = () => {
    setCurrentParticipantPage((current) =>
      Math.min(totalParticipantPages, current + 1),
    );
  };

  return {
    canGoNext,
    canGoPrevious,
    currentParticipantPage: safeParticipantPage,
    goToNextParticipantPage,
    goToPreviousParticipantPage,
    participantCount: participants.length,
    participantGridClassName,
    participantTileFrameClassName,
    showParticipantPagination: totalParticipantPages > 1,
    totalParticipantPages,
    visibleCameraTracks,
  };
}
