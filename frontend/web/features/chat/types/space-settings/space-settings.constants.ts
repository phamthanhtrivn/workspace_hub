import { SpaceSettingsTab } from "./space-settings.types";

interface SpaceSettingsTabConfig {
  id: SpaceSettingsTab;
  labelId: string;
  adminOnly?: boolean;
}

export const SPACE_SETTINGS_TABS: SpaceSettingsTabConfig[] = [
  { id: SpaceSettingsTab.OVERVIEW, labelId: "chat.overview" },
  { id: SpaceSettingsTab.MEMBERS, labelId: "chat.members", adminOnly: true },
  {
    id: SpaceSettingsTab.INVITATIONS,
    labelId: "chat.invitations",
    adminOnly: true,
  },
  {
    id: SpaceSettingsTab.PERMISSIONS,
    labelId: "chat.permissions",
    adminOnly: true,
  },
  { id: SpaceSettingsTab.DANGER, labelId: "chat.dangerZone" },
] as const;
