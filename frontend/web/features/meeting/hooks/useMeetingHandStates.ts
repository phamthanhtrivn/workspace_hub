"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getMeetingParticipants } from "../api/meeting.api";
import { meetingKeys } from "../types/meeting.query-keys";
import {
  MeetingParticipantStatusValue,
  type MeetingParticipantResponse,
} from "../types/meeting.types";

const participantHandStateLimit = 50;

export function useMeetingHandStates({
  joinToken,
  currentUserId,
  initialCurrentUserHandRaisedAt,
}: {
  joinToken: string;
  currentUserId: string | null;
  initialCurrentUserHandRaisedAt: string | null;
}) {
  const [handRaisedAtByUserId, setHandRaisedAtByUserId] = useState<
    Record<string, string>
  >(() =>
    currentUserId && initialCurrentUserHandRaisedAt
      ? { [currentUserId]: initialCurrentUserHandRaisedAt }
      : {},
  );
  const participantHandStatesQuery = useQuery({
    queryKey: meetingKeys.participantHandStates(joinToken),
    queryFn: () =>
      getMeetingParticipants({
        joinToken,
        search: "",
        page: 1,
        limit: participantHandStateLimit,
      }),
    enabled: Boolean(joinToken),
  });

  useEffect(() => {
    const participants = participantHandStatesQuery.data?.data.items;
    if (!participants) return;

    setHandRaisedAtByUserId((current) => {
      const next = { ...current };

      participants.forEach((participant) => {
        if (participant.handRaisedAt) {
          next[participant.userId] = participant.handRaisedAt;
        } else {
          delete next[participant.userId];
        }
      });

      return next;
    });
  }, [participantHandStatesQuery.data]);

  const applyParticipantHandState = useCallback(
    (participant: MeetingParticipantResponse) => {
      setHandRaisedAtByUserId((current) => {
        const next = { ...current };

        if (
          participant.status !== MeetingParticipantStatusValue.JOINED ||
          !participant.handRaisedAt
        ) {
          delete next[participant.userId];
          return next;
        }

        next[participant.userId] = participant.handRaisedAt;
        return next;
      });
    },
    [],
  );

  const setParticipantHandState = useCallback(
    (userId: string, handRaisedAt: string | null) => {
      setHandRaisedAtByUserId((current) => {
        const next = { ...current };

        if (handRaisedAt) {
          next[userId] = handRaisedAt;
        } else {
          delete next[userId];
        }

        return next;
      });
    },
    [],
  );

  const currentUserHandRaisedAt = useMemo(
    () =>
      currentUserId ? (handRaisedAtByUserId[currentUserId] ?? null) : null,
    [currentUserId, handRaisedAtByUserId],
  );
  const getParticipantHandRaisedAt = useCallback(
    (userId: string) => handRaisedAtByUserId[userId] ?? null,
    [handRaisedAtByUserId],
  );

  return {
    currentUserHandRaisedAt,
    getParticipantHandRaisedAt,
    applyParticipantHandState,
    setParticipantHandState,
  };
}
