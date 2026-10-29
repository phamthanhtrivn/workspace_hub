"use client";
import { useUserSettingsQuery } from './useUserSettingQueries';

export function useAccountTimezone() {
  return useUserSettingsQuery().data?.data.timezone || 'Asia/Ho_Chi_Minh';
}
