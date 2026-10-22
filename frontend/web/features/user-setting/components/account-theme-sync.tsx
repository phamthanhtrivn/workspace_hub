"use client";

import { useEffect } from "react";
import { useTheme } from "next-themes";
import { useAppSelector } from "@/store/store";
import { useUserSettingsQuery } from "../hooks/useUserSettingQueries";
import { isUserTheme } from "../utils/theme-preference";

/** Settings cache contains confirmed preferences; unsaved form edits stay local. */
export function AccountThemeSync() {
  const userId = useAppSelector((state) => state.auth.userId);
  const { data: response } = useUserSettingsQuery();
  const { setTheme } = useTheme();
  const savedTheme = response?.success ? response.data.theme : undefined;

  useEffect(() => {
    if (userId && isUserTheme(savedTheme)) {
      setTheme(savedTheme);
    }
  }, [userId, savedTheme, setTheme]);

  return null;
}
