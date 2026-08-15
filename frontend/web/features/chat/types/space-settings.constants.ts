import { SpaceSettingsTab } from "./space-settings.types";

interface SpaceSettingsTabConfig {
  id: SpaceSettingsTab;
  label: string;
  adminOnly?: boolean;
}

export const SPACE_SETTINGS_LABELS = {
  title: "Space Settings",
  adminFooter: "Admin settings",
  memberFooter: "Member settings",
  close: "Close",
  save: "Save",
  saving: "Saving...",
  loadingMembers: "Loading members...",
  noMembers: "No members found",
  loadingInvitations: "Loading invitations...",
  noInvitations: "No pending invitations",
  lastAdminHelp: "Promote another member to Admin before leaving this space.",
  permissionsTitle: "Channel permissions",
  allowMemberCreateChannel: "Allow members to create channels",
  allowMemberCreateChannelHelp:
    "Admins can always create channels. Channel deletion stays admin-only.",
} as const;

export const SPACE_SETTINGS_TABS: SpaceSettingsTabConfig[] = [
  { id: SpaceSettingsTab.OVERVIEW, label: "Overview" },
  { id: SpaceSettingsTab.MEMBERS, label: "Members", adminOnly: true },
  { id: SpaceSettingsTab.INVITATIONS, label: "Invitations", adminOnly: true },
  { id: SpaceSettingsTab.PERMISSIONS, label: "Permissions", adminOnly: true },
  { id: SpaceSettingsTab.DANGER, label: "Danger Zone" },
] as const;

export const SPACE_SETTINGS_CONFIRM = {
  roleTitle: "Update role?",
  removeTitle: "Remove member?",
  cancelInvitationTitle: "Cancel invitation?",
  resendInvitationTitle: "Resend invitation?",
  leaveTitle: "Leave space?",
  deleteTitle: "Delete space?",
  cancel: "Cancel",
  confirm: "Confirm",
  promote: "Promote",
  demote: "Demote",
  remove: "Remove",
  resend: "Resend",
  leave: "Leave",
  delete: "Delete",
} as const;
