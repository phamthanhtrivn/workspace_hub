"use client";

import { useCallback, useMemo, useState } from "react";
import { useAppIntl } from "@/features/i18n/useAppIntl";
import { useAppSelector } from "@/store/store";
import {
  useMeetingParticipantActions,
  useMeetingParticipants,
} from "./useMeetingParticipants";
import { useMeetingConfirmDialog } from "./useMeetingConfirmDialog";
import {
  MEETING_ROLE,
  type MeetingParticipantResponse,
  type MeetingParticipantRole,
} from "../types/meeting.types";
import {
  canRemoveMeetingParticipant,
  getRoleLabelId,
} from "../utils/meeting-room.utils";

interface UseMeetingParticipantsPanelParams {
  joinToken: string;
  participantRole: MeetingParticipantRole;
}

const EMPTY_MEETING_PARTICIPANTS: MeetingParticipantResponse[] = [];

export interface MeetingParticipantListItemState {
  participant: MeetingParticipantResponse;
  displayName: string;
  email: string;
  avatarUrl?: string | null;
  roleLabelId: string | null;
  isSelf: boolean;
  canRemove: boolean;
  canManageRole: boolean;
  canPromoteToCohost: boolean;
  canDemoteToParticipant: boolean;
}

function getParticipantDisplayName(participant: MeetingParticipantResponse) {
  return (
    participant.profile?.fullName ||
    participant.profile?.email ||
    participant.userId
  );
}

export function useMeetingParticipantsPanel({
  joinToken,
  participantRole,
}: UseMeetingParticipantsPanelParams) {
  const intl = useAppIntl();
  const authUser = useAppSelector((state) => state.auth);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const participantsQuery = useMeetingParticipants({
    joinToken,
    search,
    page,
    enabled: true,
  });
  const actions = useMeetingParticipantActions(joinToken);
  const { confirm, alertDialogProps } = useMeetingConfirmDialog();
  const participantPage = participantsQuery.data?.data;
  const participantItems = participantPage?.items ?? EMPTY_MEETING_PARTICIPANTS;
  const totalPages = participantPage?.totalPages ?? 1;
  const hasParticipants = participantItems.length > 0;
  const shouldShowPagination = hasParticipants && totalPages > 1;
  const isBusy =
    actions.removeParticipant.isPending || actions.updateRole.isPending;

  const participants = useMemo<MeetingParticipantListItemState[]>(
    () =>
      participantItems.map((participant) => {
        const isSelf = participant.userId === authUser.userId;
        const displayName = isSelf
          ? authUser.fullName ||
            authUser.email ||
            getParticipantDisplayName(participant)
          : getParticipantDisplayName(participant);
        const avatarUrl = isSelf
          ? authUser.avatarUrl || participant.profile?.avatarUrl
          : participant.profile?.avatarUrl;
        const email = isSelf
          ? authUser.email || participant.profile?.email || participant.userId
          : participant.profile?.email || participant.userId;
        const canManageRole =
          participantRole === MEETING_ROLE.HOST &&
          !isSelf &&
          participant.role !== MEETING_ROLE.HOST;

        return {
          participant,
          displayName,
          email,
          avatarUrl,
          roleLabelId: getRoleLabelId(participant.role),
          isSelf,
          canRemove: canRemoveMeetingParticipant({
            actorRole: participantRole,
            targetRole: participant.role,
            isSelf,
          }),
          canManageRole,
          canPromoteToCohost:
            canManageRole && participant.role === MEETING_ROLE.PARTICIPANT,
          canDemoteToParticipant:
            canManageRole && participant.role === MEETING_ROLE.COHOST,
        };
      }),
    [
      authUser.avatarUrl,
      authUser.email,
      authUser.fullName,
      authUser.userId,
      participantItems,
      participantRole,
    ],
  );

  const updateSearch = useCallback((value: string) => {
    setSearch(value);
    setPage(1);
  }, []);

  const handleRemove = useCallback(
    async (participant: MeetingParticipantResponse) => {
      const displayName = getParticipantDisplayName(participant);
      const confirmed = await confirm({
        title: intl.formatMessage(
          { id: "meeting.participants.removeConfirm" },
          { name: displayName },
        ),
        confirmLabel: intl.formatMessage({ id: "meeting.participants.remove" }),
        cancelLabel: intl.formatMessage({ id: "app.cancel" }),
        variant: "danger",
      });

      if (confirmed) {
        actions.removeParticipant.mutate(participant.userId);
      }
    },
    [actions.removeParticipant, confirm, intl],
  );

  const handleRoleChange = useCallback(
    async (
      participant: MeetingParticipantResponse,
      role: MeetingParticipantRole,
    ) => {
      const displayName = getParticipantDisplayName(participant);
      const isHostTransfer = role === MEETING_ROLE.HOST;
      const confirmed =
        !isHostTransfer ||
        (await confirm({
          title: intl.formatMessage(
            { id: "meeting.participants.transferHostConfirm" },
            { name: displayName },
          ),
          confirmLabel: intl.formatMessage({
            id: "meeting.participants.makeHost",
          }),
          cancelLabel: intl.formatMessage({ id: "app.cancel" }),
          variant: "warning",
        }));

      if (confirmed) {
        actions.updateRole.mutate({ userId: participant.userId, role });
      }
    },
    [actions.updateRole, confirm, intl],
  );

  return {
    search,
    page,
    totalPages,
    participants,
    participantsQuery,
    hasParticipants,
    shouldShowPagination,
    isBusy,
    setPage,
    setSearch: updateSearch,
    handleRemove,
    handleRoleChange,
    alertDialogProps,
  };
}
