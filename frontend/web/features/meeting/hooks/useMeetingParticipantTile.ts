"use client";

import { useMemo } from "react";
import {
  isTrackReference,
  useIsSpeaking,
  type TrackReferenceOrPlaceholder,
} from "@livekit/components-react";
import { Mic, MicOff, Pin, PinOff, Volume2, VolumeX } from "lucide-react";
import { useAppIntl } from "@/features/i18n/useAppIntl";
import { useAppSelector } from "@/store/store";
import type { MeetingIconDropdownItem } from "../components/common/meeting-icon-dropdown";
import {
  getRoleLabelId,
  parseParticipantMetadata,
} from "../utils/meeting-room.utils";

interface UseMeetingParticipantTileParams {
  trackRef: TrackReferenceOrPlaceholder;
  isAudioMutedForMe: boolean;
  isPinnedForMe: boolean;
  isPreferencePending: boolean;
  onToggleAudioMute?: (participantId: string) => void;
  onTogglePin?: (participantId: string) => void;
}

export function useMeetingParticipantTile({
  trackRef,
  isAudioMutedForMe,
  isPinnedForMe,
  isPreferencePending,
  onToggleAudioMute,
  onTogglePin,
}: UseMeetingParticipantTileParams) {
  const intl = useAppIntl();
  const authUser = useAppSelector((state) => state.auth);
  const participant = trackRef.participant;
  const isSpeaking = useIsSpeaking(participant);
  const metadata = parseParticipantMetadata(participant);
  const isLocalUser = participant.isLocal;
  const displayName =
    participant.name ||
    (isLocalUser ? authUser.fullName || authUser.email : null) ||
    participant.identity ||
    intl.formatMessage({ id: "app.user" });
  const avatarUrl = isLocalUser
    ? authUser.avatarUrl || metadata.avatarUrl
    : metadata.avatarUrl;
  const hasVideo =
    isTrackReference(trackRef) &&
    Boolean(trackRef.publication.track) &&
    !trackRef.publication.isMuted;
  const microphoneLabelId = participant.isMicrophoneEnabled
    ? "meeting.room.control.microphoneOn"
    : "meeting.room.control.microphoneOff";
  const participantAudioLabelId = isAudioMutedForMe
    ? "meeting.participants.mutedForMe"
    : microphoneLabelId;
  const roleLabelId = getRoleLabelId(metadata.role);
  const AudioStatusIcon = isAudioMutedForMe
    ? VolumeX
    : participant.isMicrophoneEnabled
      ? Mic
      : MicOff;
  const audioStatusIconClassName =
    isAudioMutedForMe || !participant.isMicrophoneEnabled
      ? "h-4 w-4 text-red-300"
      : "h-4 w-4";
  const shouldShowSpeakingHighlight = isSpeaking && !isAudioMutedForMe;
  const pinnedLabel = intl.formatMessage({
    id: "meeting.participants.pinned",
  });
  const actionMenuLabel = intl.formatMessage({
    id: "meeting.participants.actions",
  });
  const participantAudioLabel = intl.formatMessage({
    id: participantAudioLabelId,
  });
  const actionItems = useMemo<MeetingIconDropdownItem[]>(() => {
    const items: MeetingIconDropdownItem[] = [];

    if (!isLocalUser && onTogglePin) {
      items.push({
        id: isPinnedForMe ? "unpin-participant" : "pin-participant",
        label: intl.formatMessage({
          id: isPinnedForMe
            ? "meeting.participants.unpin"
            : "meeting.participants.pin",
        }),
        icon: isPinnedForMe ? PinOff : Pin,
        disabled: isPreferencePending,
        onSelect: () => onTogglePin(participant.identity),
      });
    }

    if (!isLocalUser && onToggleAudioMute) {
      items.push({
        id: isAudioMutedForMe
          ? "unmute-participant-for-me"
          : "mute-participant-for-me",
        label: intl.formatMessage({
          id: isAudioMutedForMe
            ? "meeting.participants.unmuteForMe"
            : "meeting.participants.muteForMe",
        }),
        icon: isAudioMutedForMe ? Volume2 : VolumeX,
        disabled: isPreferencePending,
        onSelect: () => onToggleAudioMute(participant.identity),
      });
    }

    return items;
  }, [
    intl,
    isAudioMutedForMe,
    isLocalUser,
    isPinnedForMe,
    isPreferencePending,
    onToggleAudioMute,
    onTogglePin,
    participant.identity,
  ]);

  return {
    actionItems,
    actionMenuLabel,
    AudioStatusIcon,
    audioStatusIconClassName,
    avatarUrl,
    displayName,
    hasVideo,
    participant,
    participantAudioLabel,
    pinnedLabel,
    roleLabelId,
    shouldShowSpeakingHighlight,
  };
}
