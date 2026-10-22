"use client";

import { createContext, useContext } from "react";
import type { UserSettingTab } from "../types/settings.enums";

export const OpenUserSettingsContext = createContext<((tab: UserSettingTab) => void) | null>(null);

export function useOpenUserSettings() {
  return useContext(OpenUserSettingsContext);
}
