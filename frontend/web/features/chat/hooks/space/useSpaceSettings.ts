"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Swal from "sweetalert2";
import { toast } from "sonner";
import {
  cancelSpaceInvitation,
  deleteSpace,
  getSpaceDetails,
  getSpaceInvitations,
  getSpaceMembers,
  leaveSpace,
  removeSpaceMember,
  resendSpaceInvitation,
  updateSpace,
  updateSpaceSettings,
  transferSpaceOwnership,
  updateSpaceMemberRole,
} from "../../api/chat.api";
import {
  SPACE_MEMBER_SEARCH_PAGE_SIZE,
  chatKeys,
} from "../../types/chat.constant";
import {
  SpaceMemberListItem,
  SpaceResponse,
  SpaceSettingResponse,
  SpaceRole,
} from "../../types/chat.types";
import { SPACE_SETTINGS_CONFIRM } from "../../types/space-settings/space-settings.constants";
import {
  getErrorMessage,
  getSpaceMemberName,
  isLastSpaceAdmin,
  isSpaceAdmin,
} from "../../types/space-settings/space-settings.types";
import {
  cleanupRemovedSpaceCaches,
  patchSpaceSettingInCaches,
} from "../../utils/chat-cache";
import { normalizeSpaceSetting } from "../../utils/space-setting-utils";

interface UseSpaceSettingsParams {
  isOpen: boolean;
  space: SpaceResponse;
  currentUserId: string | null;
  memberSearch: string;
  onClose: () => void;
  onSpaceDeletedOrLeft: (spaceId: string) => void;
}

export function useSpaceSettings({
  isOpen,
  space,
  currentUserId,
  memberSearch,
  onClose,
  onSpaceDeletedOrLeft,
}: UseSpaceSettingsParams) {
  const [spaceName, setSpaceName] = useState(space.name);
  const queryClient = useQueryClient();

  const detailsQuery = useQuery({
    queryKey: chatKeys.spaceDetails(space.id),
    queryFn: async () => (await getSpaceDetails(space.id)).data,
    enabled: isOpen && !!space.id,
  });

  const membersQuery = useQuery({
    queryKey: chatKeys.spaceMembers(space.id, memberSearch),
    queryFn: async () =>
      (
        await getSpaceMembers(
          space.id,
          memberSearch,
          SPACE_MEMBER_SEARCH_PAGE_SIZE,
        )
      ).data,
    enabled: isOpen && !!space.id,
  });

  const roleMembersQuery = useQuery({
    queryKey: chatKeys.spaceMembers(space.id),
    queryFn: async () =>
      (
        await getSpaceMembers(
          space.id,
          undefined,
          SPACE_MEMBER_SEARCH_PAGE_SIZE,
        )
      ).data,
    enabled: isOpen && !!space.id,
  });

  const allMembers = useMemo(
    () => [
      ...(membersQuery.data?.admins || []),
      ...(membersQuery.data?.members || []),
    ],
    [membersQuery.data],
  );

  const allRoleMembers = useMemo(
    () => [
      ...(roleMembersQuery.data?.admins || []),
      ...(roleMembersQuery.data?.members || []),
    ],
    [roleMembersQuery.data],
  );

  const currentMember =
    allMembers.find((member) => member.userId === currentUserId) ||
    allRoleMembers.find((member) => member.userId === currentUserId);
  const isAdmin = isSpaceAdmin(currentMember);
  const isLastAdmin = isLastSpaceAdmin(currentUserId, allRoleMembers);
  const isResolvingMembership =
    membersQuery.isLoading || roleMembersQuery.isLoading;
  const detail = detailsQuery.data || space;
  const invitationsQuery = useQuery({
    queryKey: chatKeys.spaceInvitations(space.id),
    queryFn: async () => (await getSpaceInvitations(space.id)).data,
    enabled: isOpen && isAdmin,
  });

  const invalidateSpaceData = () => {
    queryClient.invalidateQueries({ queryKey: chatKeys.allSpaces() });
    queryClient.invalidateQueries({ queryKey: chatKeys.allChannels() });
    queryClient.invalidateQueries({
      queryKey: chatKeys.spaceDetails(space.id),
    });
    queryClient.invalidateQueries({ queryKey: chatKeys.allSpaceMembers() });
    queryClient.invalidateQueries({
      queryKey: chatKeys.spaceInvitations(space.id),
    });
  };

  const updateSpaceMutation = useMutation({
    mutationFn: () => updateSpace(space.id, spaceName.trim()),
    onSuccess: () => {
      toast.success("Space updated");
      invalidateSpaceData();
    },
    onError: (error) =>
      toast.error(getErrorMessage(error, "Failed to update space")),
  });

  const updateSettingsMutation = useMutation({
    mutationFn: (settings: Partial<SpaceSettingResponse>) =>
      updateSpaceSettings(space.id, {
        allowMemberCreateChannel: settings.allowMemberCreateChannel,
        allowMemberDeleteOwnChannel: settings.allowMemberDeleteOwnChannel,
      }),
    onMutate: async (settings) => {
      await Promise.all([
        queryClient.cancelQueries({ queryKey: chatKeys.allSpaces() }),
        queryClient.cancelQueries({
          queryKey: chatKeys.spaceDetails(space.id),
        }),
      ]);

      const previousSpaces = queryClient.getQueriesData<SpaceResponse[]>({
        queryKey: chatKeys.allSpaces(),
      });
      const previousDetails = queryClient.getQueryData<SpaceResponse>(
        chatKeys.spaceDetails(space.id),
      );
      const nextSetting = normalizeSpaceSetting(
        {
          ...(detail.setting ?? {}),
          ...settings,
        },
        space.id,
      );

      patchSpaceSettingInCaches(queryClient, space.id, nextSetting);

      return { previousSpaces, previousDetails };
    },
    onSuccess: (response) => {
      toast.success("Space permissions updated");
      if (response.data) {
        patchSpaceSettingInCaches(queryClient, space.id, response.data);
      }
      queryClient.invalidateQueries({ queryKey: chatKeys.allSpaces() });
      queryClient.invalidateQueries({
        queryKey: chatKeys.spaceDetails(space.id),
      });
    },
    onError: (error, _settings, context) => {
      context?.previousSpaces.forEach(([queryKey, data]) => {
        queryClient.setQueryData(queryKey, data);
      });
      queryClient.setQueryData(
        chatKeys.spaceDetails(space.id),
        context?.previousDetails,
      );
      toast.error(getErrorMessage(error, "Failed to update permissions"));
    },
  });

  const transferOwnershipMutation = useMutation({
    mutationFn: (targetUserId: string) =>
      transferSpaceOwnership(space.id, targetUserId),
    onSuccess: () => {
      toast.success("Space admin transferred successfully");
      invalidateSpaceData();
    },
    onError: (error) =>
      toast.error(getErrorMessage(error, "Failed to transfer admin")),
  });

  const removeMemberMutation = useMutation({
    mutationFn: (memberId: string) => removeSpaceMember(space.id, memberId),
    onSuccess: () => {
      toast.success("Member removed");
      invalidateSpaceData();
    },
    onError: (error) =>
      toast.error(getErrorMessage(error, "Failed to remove member")),
  });

  const updateMemberRoleMutation = useMutation({
    mutationFn: ({ memberId, role }: { memberId: string; role: SpaceRole }) =>
      updateSpaceMemberRole(space.id, memberId, role),
    onSuccess: () => {
      toast.success("Member role updated");
      invalidateSpaceData();
    },
    onError: (error) =>
      toast.error(getErrorMessage(error, "Failed to update member role")),
  });

  const leaveSpaceMutation = useMutation({
    mutationFn: () => leaveSpace(space.id),
    onSuccess: async () => {
      toast.success("Left space");
      await cleanupRemovedSpaceCaches(queryClient, space.id);
      onSpaceDeletedOrLeft(space.id);
      onClose();
    },
    onError: (error) =>
      toast.error(getErrorMessage(error, "Failed to leave space")),
  });

  const deleteSpaceMutation = useMutation({
    mutationFn: () => deleteSpace(space.id),
    onSuccess: async () => {
      toast.success("Space deleted");
      await cleanupRemovedSpaceCaches(queryClient, space.id);
      onSpaceDeletedOrLeft(space.id);
      onClose();
    },
    onError: (error) =>
      toast.error(getErrorMessage(error, "Failed to delete space")),
  });

  const cancelInvitationMutation = useMutation({
    mutationFn: (invitationId: string) =>
      cancelSpaceInvitation(space.id, invitationId),
    onSuccess: () => {
      toast.success("Invitation cancelled");
      invalidateSpaceData();
    },
    onError: (error) =>
      toast.error(getErrorMessage(error, "Failed to cancel invitation")),
  });

  const resendInvitationMutation = useMutation({
    mutationFn: (invitationId: string) =>
      resendSpaceInvitation(space.id, invitationId),
    onSuccess: () => {
      toast.success("Invitation resent");
      invalidateSpaceData();
    },
    onError: (error) =>
      toast.error(getErrorMessage(error, "Failed to resend invitation")),
  });

  const confirmOwnershipTransfer = async (member: SpaceMemberListItem) => {
    const result = await Swal.fire({
      title: "Transfer admin?",
      text: `Transfer admin of this space to ${getSpaceMemberName(member)}? You will remain as an Admin.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Transfer",
      cancelButtonText: "Cancel",
    });
    if (result.isConfirmed) {
      transferOwnershipMutation.mutate(member.userId);
    }
  };

  const confirmRemoveMember = async (member: SpaceMemberListItem) => {
    const result = await Swal.fire({
      title: SPACE_SETTINGS_CONFIRM.removeTitle,
      text: `Remove ${getSpaceMemberName(member)} from this space?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: SPACE_SETTINGS_CONFIRM.remove,
      cancelButtonText: SPACE_SETTINGS_CONFIRM.cancel,
      confirmButtonColor: "#dc2626",
    });
    if (result.isConfirmed) {
      removeMemberMutation.mutate(member.userId);
    }
  };

  const confirmUpdateMemberRole = async (
    member: SpaceMemberListItem,
    role: SpaceRole,
  ) => {
    const actionText =
      role === SpaceRole.ADMIN
        ? "promote this user to Admin"
        : "demote this user to Member";
    const result = await Swal.fire({
      title: "Update role?",
      text: `Are you sure you want to ${actionText}?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Yes",
      cancelButtonText: "Cancel",
    });

    if (result.isConfirmed) {
      updateMemberRoleMutation.mutate({ memberId: member.userId, role });
    }
  };

  const confirmCancelInvitation = async (invitationId: string) => {
    const result = await Swal.fire({
      title: SPACE_SETTINGS_CONFIRM.cancelInvitationTitle,
      text: "This pending invitation will be removed.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: SPACE_SETTINGS_CONFIRM.confirm,
      cancelButtonText: SPACE_SETTINGS_CONFIRM.cancel,
    });
    if (result.isConfirmed) {
      cancelInvitationMutation.mutate(invitationId);
    }
  };

  const confirmResendInvitation = async (invitationId: string) => {
    const result = await Swal.fire({
      title: SPACE_SETTINGS_CONFIRM.resendInvitationTitle,
      text: "Send this invitation notification again?",
      icon: "question",
      showCancelButton: true,
      confirmButtonText: SPACE_SETTINGS_CONFIRM.resend,
      cancelButtonText: SPACE_SETTINGS_CONFIRM.cancel,
    });
    if (result.isConfirmed) {
      resendInvitationMutation.mutate(invitationId);
    }
  };

  const confirmLeaveSpace = async () => {
    const result = await Swal.fire({
      title: SPACE_SETTINGS_CONFIRM.leaveTitle,
      text: "You will be removed from every channel in this space.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: SPACE_SETTINGS_CONFIRM.leave,
      cancelButtonText: SPACE_SETTINGS_CONFIRM.cancel,
      confirmButtonColor: "#dc2626",
    });
    if (result.isConfirmed) {
      leaveSpaceMutation.mutate();
    }
  };

  const confirmDeleteSpace = async () => {
    const result = await Swal.fire({
      title: SPACE_SETTINGS_CONFIRM.deleteTitle,
      input: "text",
      inputLabel: `Type "${space.name}" to permanently delete this space.`,
      inputValidator: (value) =>
        value === space.name ? null : "Space name does not match.",
      icon: "error",
      showCancelButton: true,
      confirmButtonText: SPACE_SETTINGS_CONFIRM.delete,
      cancelButtonText: SPACE_SETTINGS_CONFIRM.cancel,
      confirmButtonColor: "#dc2626",
    });
    if (result.isConfirmed) {
      deleteSpaceMutation.mutate();
    }
  };

  return {
    allMembers,
    currentMember,
    detail,
    invitations: invitationsQuery.data || [],
    isAdmin,
    isLastAdmin,
    isLoadingDetails: detailsQuery.isLoading,
    isLoadingInvitations: invitationsQuery.isLoading,
    isLoadingMembers: membersQuery.isLoading,
    isResolvingMembership,
    spaceName,
    setSpaceName,
    updateSpaceMutation,
    updateSettingsMutation,
    transferOwnershipMutation,
    removeMemberMutation,
    updateMemberRoleMutation,
    leaveSpaceMutation,
    deleteSpaceMutation,
    cancelInvitationMutation,
    resendInvitationMutation,
    confirmOwnershipTransfer,
    confirmRemoveMember,
    confirmCancelInvitation,
    confirmResendInvitation,
    confirmLeaveSpace,
    confirmDeleteSpace,
    confirmUpdateMemberRole,
    invalidateSpaceData,
  };
}
