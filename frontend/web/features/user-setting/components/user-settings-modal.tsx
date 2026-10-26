"use client";

import { useCallback, useRef, useState } from "react";
import { Clock3, KeyRound, Settings, Shield, User, X } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter } from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useMediaQuery } from "@/components/ui/use-media-query";
import { useAppSelector } from "@/store/store";
import { cn } from "@/lib/utils";
import { SettingsDraftContext, type SettingsDraft, type RegisterSettingsDraft } from "../hooks/use-settings-draft";
import { UserSettingTab } from "../types/settings.enums";
import { useUserProfileQuery } from "../hooks/useUserSettingQueries";
import ProfileTab from "./profile-tab";
import SettingsTab from "./settings-tab";
import SessionsTab from "./sessions-tab";
import PasswordTab from "./password-tab";
import PomodoroTab from "./pomodoro-tab";

interface UserSettingsModalProps { isOpen: boolean; onClose: () => void; initialTab?: UserSettingTab }
const PANES = [
  { tab: UserSettingTab.PROFILE, label: "Account", icon: User },
  { tab: UserSettingTab.GENERAL, label: "Preferences", icon: Settings },
  { tab: UserSettingTab.POMODORO, label: "Pomodoro", icon: Clock3 },
  { tab: UserSettingTab.SESSION, label: "Security", icon: Shield },
  { tab: UserSettingTab.PASSWORD, label: "Password", icon: KeyRound },
];
const SAVE_ORDER = [UserSettingTab.PROFILE, UserSettingTab.GENERAL, UserSettingTab.POMODORO];
type ExitDestination = "close" | UserSettingTab;

function SettingsSession({ isOpen, onClose, initialTab = UserSettingTab.PROFILE }: UserSettingsModalProps) {
  const profileQuery = useUserProfileQuery();
  const [activeTab, setActiveTab] = useState(initialTab);
  const [visited, setVisited] = useState(() => new Set([initialTab]));
  const [summaries, setSummaries] = useState<Partial<Record<UserSettingTab, { dirty: boolean; pending: boolean }>>>({});
  const [destination, setDestination] = useState<ExitDestination | null>(null);
  const [saving, setSaving] = useState(false);
  const drafts = useRef(new Map<UserSettingTab, SettingsDraft>());
  const desktop = useMediaQuery("(min-width: 768px)");
  const register = useCallback<RegisterSettingsDraft>((tab, draft) => {
    if (draft) drafts.current.set(tab, draft); else drafts.current.delete(tab);
    setSummaries(current => {
      if (current[tab]?.dirty === draft?.dirty && current[tab]?.pending === draft?.pending) return current;
      const next = { ...current };
      if (draft) next[tab] = { dirty: draft.dirty, pending: draft.pending }; else delete next[tab];
      return next;
    });
  }, []);
  const pending = saving || Object.values(summaries).some(draft => draft?.pending);
  const dirty = Object.values(summaries).some(draft => draft?.dirty);

  const navigate = (next: ExitDestination) => {
    if (next === "close") onClose();
    else { setActiveTab(next); setVisited(current => new Set([...current, next])); }
  };
  const requestExit = (next: ExitDestination) => {
    if (pending) return;
    if (next === "close" ? dirty : activeTab === UserSettingTab.PASSWORD && summaries[UserSettingTab.PASSWORD]?.dirty) setDestination(next);
    else navigate(next);
  };
  const saveAndClose = async () => {
    if (pending) return;
    setSaving(true);
    try {
      for (const tab of SAVE_ORDER) {
        const draft = drafts.current.get(tab);
        if (draft?.dirty && !(await draft.save?.())) {
          setDestination(null); navigate(tab);
          requestAnimationFrame(() => requestAnimationFrame(() => document.querySelector<HTMLElement>(`[data-settings-pane="${tab}"] [aria-invalid="true"]`)?.focus()));
          return;
        }
      }
      drafts.current.get(UserSettingTab.PASSWORD)?.discard();
      setDestination(null); onClose();
    } finally { setSaving(false); }
  };
  const passwordOnly = destination !== "close" || !SAVE_ORDER.some(tab => summaries[tab]?.dirty);

  return <SettingsDraftContext.Provider value={register}>
    <Dialog open={isOpen} onOpenChange={open => { if (!open) requestExit("close"); }}>
      <DialogContent showCloseButton={false} className="flex h-[550px] max-h-[90dvh] w-full max-w-3xl flex-col overflow-hidden rounded-dialog border-none bg-card p-0">
        <DialogTitle className="sr-only">User settings</DialogTitle>
        <Tabs value={activeTab} orientation={desktop ? "vertical" : "horizontal"} activationMode="manual" onValueChange={value => requestExit(value as UserSettingTab)} className="flex min-h-0 flex-1 flex-col gap-0 md:flex-row">
          <div className="w-full shrink-0 border-b border-border bg-background p-4 md:w-56 md:border-b-0 md:border-r">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-section-title font-semibold">Settings</h2>
              <Button type="button" variant="ghost" size="icon" className="md:hidden" aria-label="Close settings" disabled={pending} onClick={() => requestExit("close")}><X /></Button>
            </div>
            <TabsList aria-label="Settings sections" className="flex h-auto w-full justify-start gap-1 overflow-x-auto rounded-none bg-transparent p-0 md:flex-col md:items-stretch">
              {PANES.map(({ tab, label, icon: Icon }) => <TabsTrigger unstyled key={tab} value={tab} disabled={pending} className={cn("flex min-w-[100px] shrink-0 flex-col items-center justify-center gap-1.5 rounded-control px-3 py-2.5 text-xs font-semibold md:min-w-0 md:flex-row md:justify-start md:gap-3 md:px-4 md:py-3 md:text-sm", activeTab === tab ? "bg-primary-soft text-primary-soft-foreground" : "text-muted-foreground hover:bg-muted")}>
                <span className="relative shrink-0"><Icon className="size-5 md:size-4" />{tab === UserSettingTab.PASSWORD && profileQuery.data?.data?.hasPassword === false && <span aria-hidden className="absolute -right-1 -top-1 size-2 rounded-full bg-warning-content ring-2 ring-border" />}</span><span>{label}</span>{summaries[tab]?.dirty && <span className="text-xs"><span aria-hidden>*</span><span className="sr-only">Unsaved changes</span></span>}
              </TabsTrigger>)}
            </TabsList>
          </div>
          <div className="relative min-h-0 min-w-0 flex-1 overflow-y-auto p-5 md:p-6">
            <Button type="button" variant="ghost" size="icon" className="absolute right-6 top-6 hidden md:inline-flex" aria-label="Close settings" disabled={pending} onClick={() => requestExit("close")}><X /></Button>
            {PANES.map(({ tab }) => visited.has(tab) && <TabsContent className="mx-auto mt-4 max-w-2xl" key={tab} value={tab} forceMount hidden={activeTab !== tab} data-settings-pane={tab}>
              {tab === UserSettingTab.PROFILE && <ProfileTab />}
              {tab === UserSettingTab.GENERAL && <SettingsTab />}
              {tab === UserSettingTab.POMODORO && <PomodoroTab />}
              {tab === UserSettingTab.SESSION && <SessionsTab />}
              {tab === UserSettingTab.PASSWORD && activeTab === tab && <PasswordTab />}
            </TabsContent>)}
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
    <AlertDialog open={destination !== null} closeOnOutsideClick={false} onOpenChange={open => { if (!open && !saving) setDestination(null); }}>
      <AlertDialogContent showCloseButton={false}>
        <AlertDialogHeader><AlertDialogTitle>{passwordOnly ? "Discard security input?" : "Save your changes?"}</AlertDialogTitle>
          <AlertDialogDescription>{passwordOnly ? "Passwords and verification codes are cleared when you leave this section." : "Account, Preferences and Pomodoro drafts have not been saved. Passwords and verification codes will be cleared on close."}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-wrap">
          <Button type="button" variant="outline" disabled={saving} data-modal-initial-focus onClick={() => setDestination(null)}>Keep editing</Button>
          <Button type="button" variant="destructive" disabled={saving} onClick={() => {
            if (destination === "close") drafts.current.forEach(draft => draft.discard()); else drafts.current.get(UserSettingTab.PASSWORD)?.discard();
            const next = destination; setDestination(null); if (next !== null) navigate(next);
          }}>Discard</Button>
          {!passwordOnly && <Button loading={saving} type="button" disabled={saving} onClick={() => void saveAndClose()}>{saving ? "Saving…" : "Save changes"}</Button>}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </SettingsDraftContext.Provider>;
}

export default function UserSettingsModal(props: UserSettingsModalProps) {
  const userId = useAppSelector(state => state.auth.userId);
  return props.isOpen ? <SettingsSession key={userId} {...props} /> : null;
}
