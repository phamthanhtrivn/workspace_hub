import { api } from "@/lib/axios";
import {
  UserSettingsOverview,
  UserSettings,
} from "../types/user-setting.types";

export const getUserSettingsOverview = async (): Promise<{
  success: boolean;
  data: UserSettingsOverview;
}> => {
  const response = await api.get("/users/me/settings");
  return response.data;
};

export const updateUserSettings = async (
  settings: UserSettings,
): Promise<{ success: boolean; data: UserSettings }> => {
  const response = await api.put("/users/me/settings", settings);
  return response.data;
};
