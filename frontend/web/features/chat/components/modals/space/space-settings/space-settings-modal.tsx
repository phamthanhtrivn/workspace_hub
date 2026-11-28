"use client";

import { useHydrated } from "@/lib/hooks/use-hydrated";
import { IconButton } from "@/components/ui/icon-button";

import dialogLayout from "@/components/ui/responsive-dialog.module.css";

import { useMemo, useState } from "react";

import { Settings, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { DangerZoneTab } from "./danger-zone-tab";
import { InvitationsTab } from "./invitations-tab";
import { MembersTab } from "./members-tab";
import { OverviewTab } from "./overview-tab";
import { PermissionsTab } from "./permissions-tab";
import InviteSpaceMembersModal from "../invite-space-members-modal";
import {
  SpaceMemberListItem,
  SpaceResponse,
  SpaceRole,
} from "@/features/chat/types/chat.types";
import { SpaceSettingsTab } from "@/features/chat/types/space-settings/space-settings.types";
import { SPACE_MEMBER_SEARCH_DEBOUNCE_MS } from "@/features/chat/types/chat.constant";
import { useSpaceSettings } from "@/features/chat/hooks/space/useSpaceSettings";
import { SPACE_SETTINGS_TABS } from "@/features/chat/types/space-settings/space-settings.constants";
import { useDebouncedValue } from "@/features/chat/hooks/useDebouncedValue";
import ChatConfirmDialog, {
  type ChatConfirmVariant,
} from "@/features/chat/components/ui/chat-confirm-dialog";
import {
  getSpaceMemberName,
} from "@/features/chat/types/space-settings/space-settings.types";
import { Button } from "@/components/ui/button";
import { DialogSurface } from "@/components/ui/dialog";


const TAB_LABELS: Record<SpaceSettingsTab, string> = {
  [SpaceSettingsTab.OVERVIEW]: "Overview",
  [SpaceSettingsTab.MEMBERS]: "Members",
  [SpaceSettingsTab.INVITATIONS]: "Invitations",
  [SpaceSettingsTab.PERMISSIONS]: "Permissions",
  [SpaceSettingsTab.DANGER]: "Danger Zone",
};

interface SpaceSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  space: SpaceResponse;
  currentUserId: string | null;
  onSpaceDeletedOrLeft: (spaceId: string) => void;
}

interface SpaceConfirmState {
  title: string;
  description?: string;
  confirmLabel: string;
  cancelLabel?: string;
  variant?: ChatConfirmVariant;
  confirmationText?: string;
  confirmationValue?: string;
  confirmationLabel?: string;
  onConfirm: () => void;
}

function SpaceSettingsModalForm({
  isOpen,
  onClose,
  space,
  currentUserId,
  onSpaceDeletedOrLeft,
}: SpaceSettingsModalProps) {
  const mounted = useHydrated();
  const [requestedActiveTab, setActiveTab] = useState<SpaceSettingsTab>(
    SpaceSettingsTab.OVERVIEW,
  );
  const [memberSearch, setMemberSearch] = useState("");
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [confirmState, setConfirmState] = useState<SpaceConfirmState | null>(
    null,
  );
  const debouncedMemberSearch = useDebouncedValue(
    memberSearch.trim(),
    SPACE_MEMBER_SEARCH_DEBOUNCE_MS,
  );

  const settings = useSpaceSettings({
    isOpen,
    space,
    currentUserId,
    memberSearch: debouncedMemberSearch,
    onClose,
    onSpaceDeletedOrLeft,
  });




  const isOwner =
    (settings.detail?.createdBy || space.createdBy) === currentUserId;
  const isProjectSpace = Boolean(settings.detail?.projectId || space.projectId);
  const canManagePermissions = isProjectSpace ? settings.isAdmin : isOwner;

  const visibleTabs = useMemo(
    () =>
      SPACE_SETTINGS_TABS.filter((tab) => {
        if (tab.id === SpaceSettingsTab.INVITATIONS) {
          return !isProjectSpace && settings.isAdmin;
        }
        if (tab.id === SpaceSettingsTab.PERMISSIONS) {
          return canManagePermissions;
        }
        if (tab.id === SpaceSettingsTab.DANGER) {
          return isProjectSpace ? settings.isAdmin : true;
        }
        return !tab.adminOnly || settings.isAdmin;
      }),
    [canManagePermissions, isProjectSpace, settings.isAdmin],
  );

  const activeTab = visibleTabs.some(tab => tab.id === requestedActiveTab) ? requestedActiveTab : SpaceSettingsTab.OVERVIEW;

  const openConfirm = (nextConfirm: SpaceConfirmState) => {
    setConfirmState(nextConfirm);
  };

  const closeConfirm = () => {
    setConfirmState(null);
  };

  const handleConfirm = () => {
    const action = confirmState?.onConfirm;
    setConfirmState(null);
    action?.();
  };

  const confirmOwnershipTransfer = (member: SpaceMemberListItem) => {
    openConfirm({
      title: "Transfer Space Ownership",
      description: `Transfer ownership of this space to ${getSpaceMemberName(member)}?`,
      confirmLabel: "Transfer",
      variant: "warning",
      onConfirm: () => settings.transferOwnershipMutation.mutate(member.userId),
    });
  };

  const confirmRemoveMember = (member: SpaceMemberListItem) => {
    openConfirm({
      title: "Remove Member",
      description: `Remove ${getSpaceMemberName(member)} from this space?`,
      confirmLabel: "Remove",
      variant: "danger",
      onConfirm: () => settings.removeMemberMutation.mutate(member.userId),
    });
  };

  const confirmUpdateMemberRole = (
    member: SpaceMemberListItem,
    role: SpaceRole,
  ) => {
    const isPromoting = role === SpaceRole.ADMIN;
    const actionLabel = isPromoting ? "Promote" : "Demote";
    const roleLabel = isPromoting ? "to Admin" : "to Member";
    openConfirm({
      title: isPromoting ? "Promote to Admin" : "Demote to Member",
      description: `${actionLabel} ${getSpaceMemberName(member)} ${roleLabel}?`,
      confirmLabel: isPromoting ? "Promote" : "Demote",
      variant: "warning",
      onConfirm: () =>
        settings.updateMemberRoleMutation.mutate({
          memberId: member.userId,
          role,
        }),
    });
  };

  const confirmCancelInvitation = (invitationId: string) => {
    openConfirm({
      title: "Cancel Invitation",
      description: "Cancel this pending space invitation?",
      confirmLabel: "Cancel Invitation",
      variant: "warning",
      onConfirm: () => settings.cancelInvitationMutation.mutate(invitationId),
    });
  };

  const confirmResendInvitation = (invitationId: string) => {
    openConfirm({
      title: "Resend Invitation",
      description: "Resend this invitation email?",
      confirmLabel: "Resend",
      variant: "info",
      onConfirm: () => settings.resendInvitationMutation.mutate(invitationId),
    });
  };

  const confirmLeaveSpace = () => {
    if (isProjectSpace) return;
    openConfirm({
      title: "Leave Space",
      description:
        "You will lose access to all channels and messages in this space.",
      confirmLabel: "Leave",
      variant: "danger",
      onConfirm: () => settings.leaveSpaceMutation.mutate(),
    });
  };

  const confirmDeleteSpace = () => {
    openConfirm({
      title: "Delete Space",
      description:
        "Permanently delete this space and all its channels, messages, and files.",
      confirmLabel: "Delete",
      variant: "danger",
      confirmationText: space.name,
      confirmationValue: "",
      confirmationLabel: `Type "${space.name}" to confirm deletion`,
      onConfirm: () => settings.deleteSpaceMutation.mutate(),
    });
  };

  if (!isOpen || !mounted) return null;

  return <DialogSurface onClose={onClose}>{<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-overlay/40">
      <div className={`${dialogLayout.surface} w-full max-w-3xl max-h-[90vh] overflow-hidden rounded-panel border border-border bg-card flex flex-col`}>
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <div className="min-w-0">
            <h2 className="text-section-title font-semibold text-foreground truncate">
              Space Settings
            </h2>
            <p className="text-xs text-muted-foreground truncate">{space.name}</p>
          </div>
          <IconButton label="Close" showTooltip={false} size="icon-sm" aria-label="Close"
            type="button"
            onClick={onClose}
            className="p-2 rounded-control text-muted-foreground hover:text-foreground hover:bg-muted transition cursor-pointer"
          >
            <X size={18} />
          </IconButton>
        </div>

        <div className="flex min-h-0 flex-1 flex-col sm:flex-row">
          <div className="w-full shrink-0 border-b border-border bg-background p-2 flex flex-wrap gap-2 sm:w-44 sm:flex-col sm:border-b-0 sm:border-r">
            {visibleTabs.map((tab) => (
              <Button variant="unstyled"
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "w-full text-left px-3 py-2 rounded-control text-xs font-semibold transition cursor-pointer",
                  activeTab === tab.id
                    ? "bg-card text-info-content"
                    : "text-muted-foreground hover:bg-card hover:text-foreground",
                )}
              >
                {TAB_LABELS[tab.id] || tab.id}
              </Button>
            ))}
          </div>

          <div className="flex-1 min-w-0 overflow-y-auto p-5">
            {activeTab === SpaceSettingsTab.OVERVIEW && (
              <OverviewTab
                detail={settings.detail}
                isOwner={isOwner}
                isLoadingDetails={settings.isLoadingDetails}
                isSaving={settings.updateSpaceMutation.isPending}
                originalName={space.name}
                spaceName={settings.spaceName}
                onSpaceNameChange={settings.setSpaceName}
                onSave={() => settings.updateSpaceMutation.mutate()}
              />
            )}

            {activeTab === SpaceSettingsTab.MEMBERS && settings.isAdmin && (
              <MembersTab
                currentUserId={currentUserId}
                currentUserRole={settings.currentMember?.role}
                isLoading={settings.isLoadingMembers}
                isMutating={
                  settings.transferOwnershipMutation.isPending ||
                  settings.removeMemberMutation.isPending ||
                  settings.updateMemberRoleMutation.isPending
                }
                allowRoleUpdates={isProjectSpace}
                members={settings.allMembers}
                readOnly={isProjectSpace}
                search={memberSearch}
                onSearchChange={setMemberSearch}
                onTransferOwnership={confirmOwnershipTransfer}
                onRemove={confirmRemoveMember}
                onUpdateRole={confirmUpdateMemberRole}
                spaceCreatorId={settings.detail?.createdBy || space.createdBy}
              />
            )}

            {activeTab === SpaceSettingsTab.INVITATIONS && settings.isAdmin && (
              <InvitationsTab
                invitations={settings.invitations}
                isLoading={settings.isLoadingInvitations}
                isMutating={
                  settings.cancelInvitationMutation.isPending ||
                  settings.resendInvitationMutation.isPending
                }
                onCancel={confirmCancelInvitation}
                onInvite={() => setIsInviteModalOpen(true)}
                onResend={confirmResendInvitation}
              />
            )}

            {activeTab === SpaceSettingsTab.PERMISSIONS &&
              canManagePermissions && (
              <PermissionsTab
                isSaving={settings.updateSettingsMutation.isPending}
                setting={settings.detail.setting}
                onAllowMemberCreateChannelChange={(allowMemberCreateChannel) =>
                  settings.updateSettingsMutation.mutate({
                    allowMemberCreateChannel,
                  })
                }
                onAllowMemberDeleteOwnChannelChange={(
                  allowMemberDeleteOwnChannel,
                ) =>
                  settings.updateSettingsMutation.mutate({
                    allowMemberDeleteOwnChannel,
                  })
                }
              />
              )}

            {activeTab === SpaceSettingsTab.DANGER && (
              <DangerZoneTab
                isAdmin={settings.isAdmin}
                isOwner={isOwner}
                canDelete={isProjectSpace ? settings.isAdmin : isOwner}
                hideLeave={isProjectSpace}
                isDeleting={settings.deleteSpaceMutation.isPending}
                isLastAdmin={settings.isLastAdmin}
                isLeaving={settings.leaveSpaceMutation.isPending}
                isResolvingMembership={settings.isResolvingMembership}
                onDelete={confirmDeleteSpace}
                onLeave={confirmLeaveSpace}
              />
            )}
          </div>
        </div>

        <div className="px-5 py-3 border-t border-border bg-background flex shrink-0 flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Settings size={14} />
            {settings.isAdmin
              ? "Admin Settings"
              : "Member Settings"}
          </div>
          <Button variant="secondary"
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-control text-sm font-semibold transition cursor-pointer"
          >
            Close
          </Button>
        </div>

        {settings.isAdmin && !isProjectSpace && (
          <InviteSpaceMembersModal
            isOpen={isInviteModalOpen}
            onClose={() => setIsInviteModalOpen(false)}
            onInvited={settings.invalidateSpaceData}
            spaceId={space.id}
          />
        )}
        <ChatConfirmDialog
          open={Boolean(confirmState)}
          title={confirmState?.title ?? ""}
          description={confirmState?.description}
          confirmLabel={confirmState?.confirmLabel ?? "Confirm"}
          cancelLabel={confirmState?.cancelLabel}
          variant={confirmState?.variant}
          confirmationText={confirmState?.confirmationText}
          confirmationValue={confirmState?.confirmationValue}
          confirmationLabel={confirmState?.confirmationLabel}
          onConfirmationValueChange={(confirmationValue) =>
            setConfirmState((current) =>
              current ? { ...current, confirmationValue } : current,
            )
          }
          onConfirm={handleConfirm}
          onCancel={closeConfirm}
        />
      </div>
    </div>}</DialogSurface>;
}


export default function SpaceSettingsModal(props: SpaceSettingsModalProps) {
  return props.isOpen ? <SpaceSettingsModalForm key={JSON.stringify([props.space.id, props.space.name])} {...props} /> : null;
}
