"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
  SpaceResponse,
  SpaceSettingResponse,
  SpaceRole,
} from "../../types/chat.types";
import {
  getErrorMessage,
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
  currentUserId?: string | null;
  memberSearch: string;
  onClose: () => void;
  onSpaceDeletedOrLeft?: (spaceId: string) => void;
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
  const isLastAdmin = isLastSpaceAdmin(currentUserId || null, allRoleMembers);
  const isResolvingMembership =
    membersQuery.isLoading || roleMembersQuery.isLoading;
  const detail = detailsQuery.data || space;
  const isProjectSpace = Boolean(detail.projectId || space.projectId);
  const invitationsQuery = useQuery({
    queryKey: chatKeys.spaceInvitations(space.id),
    queryFn: async () => (await getSpaceInvitations(space.id)).data,
    enabled: isOpen && isAdmin && !isProjectSpace,
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
      toast.success("Space updated successfully");
      invalidateSpaceData();
    },
    onError: (error) =>
      toast.error(
        getErrorMessage(
          error,
          "Failed to update space",
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
      toast.error(
        getErrorMessage(
          error,
          "Failed to update space permissions",
        ),
      );
    },
  });

  const transferOwnershipMutation = useMutation({
    mutationFn: (targetUserId: string) =>
      transferSpaceOwnership(space.id, targetUserId),
    onSuccess: () => {
      toast.success("Space ownership transferred");
      invalidateSpaceData();
    },
    onError: (error) =>
      toast.error(
        getErrorMessage(
          error,
          "Failed to transfer space ownership",
        ),
      ),
  });

  const removeMemberMutation = useMutation({
    mutationFn: (memberId: string) => removeSpaceMember(space.id, memberId),
    onSuccess: () => {
      toast.success("Member removed from space");
      invalidateSpaceData();
    },
    onError: (error) =>
      toast.error(
        getErrorMessage(
          error,
          "Failed to remove member",
        ),
      ),
  });

  const updateMemberRoleMutation = useMutation({
    mutationFn: ({ memberId, role }: { memberId: string; role: SpaceRole }) =>
      updateSpaceMemberRole(space.id, memberId, role),
    onSuccess: () => {
      toast.success("Member role updated");
      invalidateSpaceData();
    },
    onError: (error) =>
      toast.error(
        getErrorMessage(
          error,
          "Failed to update member role",
        ),
      ),
  });

  const leaveSpaceMutation = useMutation({
    mutationFn: () => leaveSpace(space.id),
    onSuccess: async () => {
      toast.success("Left space successfully");
      await cleanupRemovedSpaceCaches(queryClient, space.id);
      onSpaceDeletedOrLeft?.(space.id);
      onClose();
    },
    onError: (error) =>
      toast.error(
        getErrorMessage(
          error,
          "Failed to leave space",
        ),
      ),
  });

  const deleteSpaceMutation = useMutation({
    mutationFn: () => deleteSpace(space.id),
    onSuccess: async () => {
      toast.success("Space deleted successfully");
      await cleanupRemovedSpaceCaches(queryClient, space.id);
      onSpaceDeletedOrLeft?.(space.id);
      onClose();
    },
    onError: (error) =>
      toast.error(
        getErrorMessage(
          error,
          "Failed to delete space",
        ),
      ),
  });

  const cancelInvitationMutation = useMutation({
    mutationFn: (invitationId: string) =>
      cancelSpaceInvitation(space.id, invitationId),
    onSuccess: () => {
      toast.success("Invitation cancelled");
      invalidateSpaceData();
    },
    onError: (error) =>
      toast.error(
        getErrorMessage(
          error,
          "Failed to cancel invitation",
        ),
      ),
  });

  const resendInvitationMutation = useMutation({
    mutationFn: (invitationId: string) =>
      resendSpaceInvitation(space.id, invitationId),
    onSuccess: () => {
      toast.success("Invitation resent");
      invalidateSpaceData();
    },
    onError: (error) =>
      toast.error(
        getErrorMessage(
          error,
          "Failed to resend invitation",
        ),
      ),
  });

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
    invalidateSpaceData,
  };
}
