"use client";

import { createContext, useContext, useEffect, useLayoutEffect, useRef } from "react";
import type { UserSettingTab } from "../types/settings.enums";

export interface SettingsDraft {
  dirty: boolean;
  pending: boolean;
  save?: () => Promise<boolean>;
  discard: () => void;
}
export type RegisterSettingsDraft = (tab: UserSettingTab, draft: SettingsDraft | null) => void;
export const SettingsDraftContext = createContext<RegisterSettingsDraft | null>(null);

export function useSettingsDraft(tab: UserSettingTab, draft: SettingsDraft) {
  const register = useContext(SettingsDraftContext);
  const actions = useRef(draft);
  useLayoutEffect(() => { actions.current = draft; });
  useEffect(() => {
    register?.(tab, {
      dirty: draft.dirty, pending: draft.pending,
      save: () => actions.current.save?.() ?? Promise.resolve(false),
      discard: () => actions.current.discard(),
    });
    return () => register?.(tab, null);
  }, [register, tab, draft.dirty, draft.pending]);
}
