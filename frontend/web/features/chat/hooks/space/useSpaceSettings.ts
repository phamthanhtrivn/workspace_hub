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
import { useAppIntl } from "@/features/i18n/useAppIntl";

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
  const intl = useAppIntl();
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
      toast.success(intl.formatMessage({ id: "chat.spaceUpdated" }));
      invalidateSpaceData();
    },
    onError: (error) =>
      toast.error(
        getErrorMessage(
          error,
          intl.formatMessage({ id: "chat.updateSpaceFailed" }),
        ),
      ),
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
      toast.success(intl.formatMessage({ id: "chat.spacePermissionsUpdated" }));
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
      toast.error(
        getErrorMessage(
          error,
          intl.formatMessage({ id: "chat.updatePermissionsFailed" }),
        ),
      );
    },
  });

  const transferOwnershipMutation = useMutation({
    mutationFn: (targetUserId: string) =>
      transferSpaceOwnership(space.id, targetUserId),
    onSuccess: () => {
      toast.success(intl.formatMessage({ id: "chat.spaceAdminTransferred" }));
      invalidateSpaceData();
    },
    onError: (error) =>
      toast.error(
        getErrorMessage(
          error,
          intl.formatMessage({ id: "chat.transferAdminFailed" }),
        ),
      ),
  });

  const removeMemberMutation = useMutation({
    mutationFn: (memberId: string) => removeSpaceMember(space.id, memberId),
    onSuccess: () => {
      toast.success(intl.formatMessage({ id: "chat.memberRemoved" }));
      invalidateSpaceData();
    },
    onError: (error) =>
      toast.error(
        getErrorMessage(
          error,
          intl.formatMessage({ id: "chat.removeMemberFailed" }),
        ),
      ),
  });

  const updateMemberRoleMutation = useMutation({
    mutationFn: ({ memberId, role }: { memberId: string; role: SpaceRole }) =>
      updateSpaceMemberRole(space.id, memberId, role),
    onSuccess: () => {
      toast.success(intl.formatMessage({ id: "chat.memberRoleUpdated" }));
      invalidateSpaceData();
    },
    onError: (error) =>
      toast.error(
        getErrorMessage(
          error,
          intl.formatMessage({ id: "chat.updateMemberRoleFailed" }),
        ),
      ),
  });

  const leaveSpaceMutation = useMutation({
    mutationFn: () => leaveSpace(space.id),
    onSuccess: async () => {
      toast.success(intl.formatMessage({ id: "chat.leftSpace" }));
      await cleanupRemovedSpaceCaches(queryClient, space.id);
      onSpaceDeletedOrLeft(space.id);
      onClose();
    },
    onError: (error) =>
      toast.error(
        getErrorMessage(
          error,
          intl.formatMessage({ id: "chat.leaveSpaceFailed" }),
        ),
      ),
  });

  const deleteSpaceMutation = useMutation({
    mutationFn: () => deleteSpace(space.id),
    onSuccess: async () => {
      toast.success(intl.formatMessage({ id: "chat.spaceDeleted" }));
      await cleanupRemovedSpaceCaches(queryClient, space.id);
      onSpaceDeletedOrLeft(space.id);
      onClose();
    },
    onError: (error) =>
      toast.error(
        getErrorMessage(
          error,
          intl.formatMessage({ id: "chat.deleteSpaceFailed" }),
        ),
      ),
  });

  const cancelInvitationMutation = useMutation({
    mutationFn: (invitationId: string) =>
      cancelSpaceInvitation(space.id, invitationId),
    onSuccess: () => {
      toast.success(intl.formatMessage({ id: "chat.invitationCancelled" }));
      invalidateSpaceData();
    },
    onError: (error) =>
      toast.error(
        getErrorMessage(
          error,
          intl.formatMessage({ id: "chat.cancelInvitationFailed" }),
        ),
      ),
  });

  const resendInvitationMutation = useMutation({
    mutationFn: (invitationId: string) =>
      resendSpaceInvitation(space.id, invitationId),
    onSuccess: () => {
      toast.success(intl.formatMessage({ id: "chat.invitationResent" }));
      invalidateSpaceData();
    },
    onError: (error) =>
      toast.error(
        getErrorMessage(
          error,
          intl.formatMessage({ id: "chat.resendInvitationFailed" }),
        ),
      ),
  });

  const confirmOwnershipTransfer = async (member: SpaceMemberListItem) => {
    const result = await Swal.fire({
      title: intl.formatMessage({ id: "chat.transferAdminTitle" }),
      text: intl.formatMessage(
        { id: "chat.transferAdminDescription" },
        { name: getSpaceMemberName(member) },
      ),
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: intl.formatMessage({ id: "chat.transfer" }),
      cancelButtonText: intl.formatMessage({ id: "app.cancel" }),
    });
    if (result.isConfirmed) {
      transferOwnershipMutation.mutate(member.userId);
    }
  };

  const confirmRemoveMember = async (member: SpaceMemberListItem) => {
    const result = await Swal.fire({
      title: intl.formatMessage({ id: "chat.removeMemberTitle" }),
      text: intl.formatMessage(
        { id: "chat.removeMemberDescription" },
        { name: getSpaceMemberName(member) },
      ),
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: intl.formatMessage({ id: "chat.remove" }),
      cancelButtonText: intl.formatMessage({ id: "app.cancel" }),
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
        ? intl.formatMessage({ id: "chat.promoteThisUserToAdmin" })
        : intl.formatMessage({ id: "chat.demoteThisUserToMember" });
    const result = await Swal.fire({
      title: intl.formatMessage({ id: "chat.updateRoleTitle" }),
      text: intl.formatMessage(
        { id: "chat.updateRoleDescription" },
        { action: actionText },
      ),
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: intl.formatMessage({ id: "app.yes" }),
      cancelButtonText: intl.formatMessage({ id: "app.cancel" }),
    });

    if (result.isConfirmed) {
      updateMemberRoleMutation.mutate({ memberId: member.userId, role });
    }
  };

  const confirmCancelInvitation = async (invitationId: string) => {
    const result = await Swal.fire({
      title: intl.formatMessage({ id: "chat.cancelInvitationTitle" }),
      text: intl.formatMessage({ id: "chat.cancelInvitationDescription" }),
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: intl.formatMessage({ id: "chat.confirm" }),
      cancelButtonText: intl.formatMessage({ id: "app.cancel" }),
    });
    if (result.isConfirmed) {
      cancelInvitationMutation.mutate(invitationId);
    }
  };

  const confirmResendInvitation = async (invitationId: string) => {
    const result = await Swal.fire({
      title: intl.formatMessage({ id: "chat.resendInvitationTitle" }),
      text: intl.formatMessage({ id: "chat.resendInvitationDescription" }),
      icon: "question",
      showCancelButton: true,
      confirmButtonText: intl.formatMessage({ id: "chat.resend" }),
      cancelButtonText: intl.formatMessage({ id: "app.cancel" }),
    });
    if (result.isConfirmed) {
      resendInvitationMutation.mutate(invitationId);
    }
  };

  const confirmLeaveSpace = async () => {
    const result = await Swal.fire({
      title: intl.formatMessage({ id: "chat.leaveSpaceTitle" }),
      text: intl.formatMessage({ id: "chat.leaveSpaceDescription" }),
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: intl.formatMessage({ id: "chat.leave" }),
      cancelButtonText: intl.formatMessage({ id: "app.cancel" }),
      confirmButtonColor: "#dc2626",
    });
    if (result.isConfirmed) {
      leaveSpaceMutation.mutate();
    }
  };

  const confirmDeleteSpace = async () => {
    const result = await Swal.fire({
      title: intl.formatMessage({ id: "chat.deleteSpaceTitle" }),
      input: "text",
      inputLabel: intl.formatMessage(
        { id: "chat.deleteSpaceInputLabel" },
        { name: space.name },
      ),
      inputValidator: (value) =>
        value === space.name
          ? null
          : intl.formatMessage({ id: "chat.spaceNameDoesNotMatch" }),
      icon: "error",
      showCancelButton: true,
      confirmButtonText: intl.formatMessage({ id: "app.delete" }),
      cancelButtonText: intl.formatMessage({ id: "app.cancel" }),
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
