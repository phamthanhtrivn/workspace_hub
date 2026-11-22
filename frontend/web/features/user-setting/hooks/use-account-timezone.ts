"use client";
import { useSyncExternalStore } from "react";
import { FALLBACK_TIMEZONE, getDisplayTimezone, subscribeDisplayTimezone } from "@/lib/timezone";

export function useAccountTimezone() {
  return useSyncExternalStore(subscribeDisplayTimezone, getDisplayTimezone, () => FALLBACK_TIMEZONE);
}
