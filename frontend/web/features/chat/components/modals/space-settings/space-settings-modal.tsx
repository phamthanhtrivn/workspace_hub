"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Settings, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { SPACE_MEMBER_SEARCH_DEBOUNCE_MS } from "../../../types/chat.constant";
import { SpaceResponse } from "../../../types/chat.types";
import { useDebouncedValue } from "../../../hooks/useDebouncedValue";
import { DangerZoneTab } from "./danger-zone-tab";
import { InvitationsTab } from "./invitations-tab";
import { MembersTab } from "./members-tab";
import { OverviewTab } from "./overview-tab";
import { PermissionsTab } from "./permissions-tab";
import InviteSpaceMembersModal from "../invite-space-members-modal";
import {
  SPACE_SETTINGS_LABELS,
  SPACE_SETTINGS_TABS,
} from "../../../types/space-settings.constants";
import { SpaceSettingsTab } from "../../../types/space-settings.types";
import { useSpaceSettings } from "../../../hooks/useSpaceSettings";

interface SpaceSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  space: SpaceResponse;
  currentUserId: string | null;
  onSpaceDeletedOrLeft: (spaceId: string) => void;
}

export default function SpaceSettingsModal({
  isOpen,
  onClose,
  space,
  currentUserId,
  onSpaceDeletedOrLeft,
}: SpaceSettingsModalProps) {
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<SpaceSettingsTab>(
    SpaceSettingsTab.OVERVIEW,
  );
  const [memberSearch, setMemberSearch] = useState("");
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
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

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    if (isOpen) {
      settings.setSpaceName(space.name);
      setActiveTab(SpaceSettingsTab.OVERVIEW);
      setMemberSearch("");
      setIsInviteModalOpen(false);
    }
  }, [isOpen, settings.setSpaceName, space.name]);

  const isOwner = (settings.detail?.createdBy || space.createdBy) === currentUserId;

  const visibleTabs = useMemo(
    () =>
      SPACE_SETTINGS_TABS.filter((tab) => {
        if (tab.id === SpaceSettingsTab.PERMISSIONS) {
          return isOwner;
        }
        return !tab.adminOnly || settings.isAdmin;
      }),
    [settings.isAdmin, isOwner],
  );

  useEffect(() => {
    if (!visibleTabs.some((tab) => tab.id === activeTab)) {
      setActiveTab(SpaceSettingsTab.OVERVIEW);
    }
  }, [activeTab, visibleTabs]);

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-3xl max-h-[90vh] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl flex flex-col">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="min-w-0">
            <h2 className="text-base font-bold text-slate-900 truncate">
              {SPACE_SETTINGS_LABELS.title}
            </h2>
            <p className="text-xs text-slate-500 truncate">{space.name}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex min-h-0 flex-1">
          <div className="w-44 shrink-0 border-r border-slate-100 bg-slate-50/70 p-2 flex flex-col gap-2">
            {visibleTabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "w-full text-left px-3 py-2 rounded-xl text-xs font-semibold transition cursor-pointer",
                  activeTab === tab.id
                    ? "bg-white text-blue-700 shadow-sm"
                    : "text-slate-500 hover:bg-white hover:text-slate-800",
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex-1 min-w-0 overflow-y-auto p-5">
            {activeTab === SpaceSettingsTab.OVERVIEW && (
              <OverviewTab
                detail={settings.detail}
                isAdmin={settings.isAdmin}
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
                isLoading={settings.isLoadingMembers}
                isMutating={
                  settings.transferOwnershipMutation.isPending ||
                  settings.removeMemberMutation.isPending ||
                  settings.updateMemberRoleMutation.isPending
                }
                members={settings.allMembers}
                search={memberSearch}
                onSearchChange={setMemberSearch}
                onTransferOwnership={settings.confirmOwnershipTransfer}
                onRemove={settings.confirmRemoveMember}
                onUpdateRole={settings.confirmUpdateMemberRole}
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
                onCancel={settings.confirmCancelInvitation}
                onInvite={() => setIsInviteModalOpen(true)}
                onResend={settings.confirmResendInvitation}
              />
            )}

            {activeTab === SpaceSettingsTab.PERMISSIONS && isOwner && (
              <PermissionsTab
                isSaving={settings.updateSettingsMutation.isPending}
                setting={settings.detail.setting}
                onAllowMemberCreateChannelChange={(allowMemberCreateChannel) =>
                  settings.updateSettingsMutation.mutate({
                    allowMemberCreateChannel,
                  })
                }
                onAllowMemberDeleteOwnChannelChange={(allowMemberDeleteOwnChannel) =>
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
                isDeleting={settings.deleteSpaceMutation.isPending}
                isLastAdmin={settings.isLastAdmin}
                isLeaving={settings.leaveSpaceMutation.isPending}
                isResolvingMembership={settings.isResolvingMembership}
                onDelete={settings.confirmDeleteSpace}
                onLeave={settings.confirmLeaveSpace}
              />
            )}
          </div>
        </div>

        <div className="px-5 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Settings size={14} />
            {settings.isAdmin
              ? SPACE_SETTINGS_LABELS.adminFooter
              : SPACE_SETTINGS_LABELS.memberFooter}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-300 transition cursor-pointer"
          >
            {SPACE_SETTINGS_LABELS.close}
          </button>
        </div>

        {settings.isAdmin && (
          <InviteSpaceMembersModal
            isOpen={isInviteModalOpen}
            onClose={() => setIsInviteModalOpen(false)}
            onInvited={settings.invalidateSpaceData}
            spaceId={space.id}
          />
        )}
      </div>
    </div>,
    document.body,
  );
}
