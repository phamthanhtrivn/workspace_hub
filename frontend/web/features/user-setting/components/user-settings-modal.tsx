"use client";

import React, { useEffect, useState } from "react";
import { Clock3, KeyRound, Settings, Shield, User, X } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import ProfileTab from "./profile-tab";
import SettingsTab from "./settings-tab";
import SessionsTab from "./sessions-tab";
import PasswordTab from "./password-tab";
import PomodoroTab from "./pomodoro-tab";
import { UserSettingTab } from "../types/settings.enums";
import { useUserProfileQuery } from "../hooks/useUserSettingQueries";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";


type UserSettingsModalProps = {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: UserSettingTab;
};

const UserSettingsModal = React.memo(function UserSettingsModal({
  isOpen,
  onClose,
  initialTab = UserSettingTab.PROFILE,
}: UserSettingsModalProps) {
  const [activeTab, setActiveTab] = useState<UserSettingTab>(
    initialTab ?? UserSettingTab.PROFILE,
  );
  const { data: profileResponse } = useUserProfileQuery();
  const hasPassword = profileResponse?.data?.hasPassword ?? true;

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        showCloseButton={false}
        className="flex h-[550px] max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-dialog border-none bg-card p-0 md:flex-row"
      >
        <DialogTitle className="sr-only">User Settings</DialogTitle>
        <div className="w-full border-b border-border bg-background p-4 md:w-56 md:border-b-0 md:border-r">
          <div className="mb-6 flex items-center justify-between md:mb-8">
            <h2 className="text-section-title font-semibold text-foreground">
              Settings
            </h2>
            <Button variant="unstyled"
              onClick={onClose}
              className="rounded-control p-2 text-muted-foreground hover:bg-accent hover:text-muted-foreground md:hidden cursor-pointer"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          <nav className="flex justify-start space-x-2 overflow-x-auto pb-2 md:pb-0 md:flex-col md:space-x-0 md:space-y-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            <Button variant="unstyled"
              onClick={() => setActiveTab(UserSettingTab.PROFILE)}
              className={cn(
                `flex min-w-[100px] shrink-0 flex-col items-center justify-center gap-1.5 rounded-control px-3 py-2.5 transition-colors cursor-pointer md:min-w-0 md:flex-row md:justify-start md:gap-3 md:px-4 md:py-3 md:text-sm md:font-semibold ${
                  activeTab === UserSettingTab.PROFILE
                    ? "text-primary-soft-foreground bg-primary-soft"
                    : "text-muted-foreground hover:bg-muted"
                }`,
              )}
            >
              <User className="h-5 w-5 md:h-4 md:w-4" />
              <span className="text-xs font-semibold md:text-sm">
                Account
              </span>
            </Button>
            <Button variant="unstyled"
              onClick={() => setActiveTab(UserSettingTab.GENERAL)}
              className={cn(
                `flex min-w-[100px] shrink-0 flex-col items-center justify-center gap-1.5 rounded-control px-3 py-2.5 transition-colors cursor-pointer md:min-w-0 md:flex-row md:justify-start md:gap-3 md:px-4 md:py-3 md:text-sm md:font-semibold ${
                  activeTab === UserSettingTab.GENERAL
                    ? "text-primary-soft-foreground bg-primary-soft"
                    : "text-muted-foreground hover:bg-muted"
                }`,
              )}
            >
              <Settings className="h-5 w-5 md:h-4 md:w-4" />
              <span className="text-xs font-semibold md:text-sm">
                Preferences
              </span>
            </Button>
            <Button variant="unstyled"
              type="button"
              onClick={() => setActiveTab(UserSettingTab.POMODORO)}
              aria-current={activeTab === UserSettingTab.POMODORO ? "page" : undefined}
              className={cn(
                "flex min-w-[110px] shrink-0 cursor-pointer flex-col items-center justify-center gap-1.5 rounded-control px-3 py-2.5 transition-colors md:min-w-0 md:flex-row md:justify-start md:gap-3 md:px-4 md:py-3 md:text-sm md:font-semibold",
                activeTab === UserSettingTab.POMODORO
                  ? "bg-primary-soft text-primary-soft-foreground"
                  : "text-muted-foreground hover:bg-muted",
              )}
            >
              <Clock3 className="h-5 w-5 md:h-4 md:w-4" />
              <span className="text-xs font-semibold md:text-sm">Pomodoro</span>
            </Button>
            <Button variant="unstyled"
              onClick={() => setActiveTab(UserSettingTab.SESSION)}
              className={cn(
                `flex min-w-[110px] shrink-0 flex-col items-center justify-center gap-1.5 rounded-control px-3 py-2.5 transition-colors cursor-pointer md:min-w-0 md:flex-row md:justify-start md:gap-3 md:px-4 md:py-3 md:text-sm md:font-semibold ${
                  activeTab === UserSettingTab.SESSION
                    ? "text-primary-soft-foreground bg-primary-soft"
                    : "text-muted-foreground hover:bg-muted"
                }`,
              )}
            >
              <Shield className="h-5 w-5 md:h-4 md:w-4" />
              <span className="text-xs font-semibold md:text-sm">
                Security
              </span>
            </Button>
            <Button variant="unstyled"
              onClick={() => setActiveTab(UserSettingTab.PASSWORD)}
              className={cn(
                `relative flex min-w-[110px] shrink-0 flex-col items-center justify-center gap-1.5 rounded-control px-3 py-2.5 transition-colors cursor-pointer md:min-w-0 md:flex-row md:justify-start md:gap-3 md:px-4 md:py-3 md:text-sm md:font-semibold ${
                  activeTab === UserSettingTab.PASSWORD
                    ? "text-primary-soft-foreground bg-primary-soft"
                    : "text-muted-foreground hover:bg-muted"
                }`,
              )}
            >
              <span className="relative">
                <KeyRound className="h-5 w-5 md:h-4 md:w-4" />
                {!hasPassword && (
                  <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-warning-content ring-2 ring-border" />
                )}
              </span>
              <span className="text-xs font-semibold md:text-sm">
                Password
              </span>
            </Button>
          </nav>
        </div>

        <div className="relative min-h-0 min-w-0 flex-1 overflow-y-auto p-5 md:p-6">
          <Button variant="unstyled"
            onClick={onClose}
            className="absolute right-6 top-6 hidden rounded-control p-2 text-muted-foreground hover:bg-muted hover:text-muted-foreground md:block cursor-pointer"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </Button>

          <div className="mx-auto max-w-2xl mt-4">
            {activeTab === UserSettingTab.PROFILE && <ProfileTab />}
            {activeTab === UserSettingTab.GENERAL && <SettingsTab />}
            {isOpen && activeTab === UserSettingTab.POMODORO && <PomodoroTab />}
            {activeTab === UserSettingTab.SESSION && <SessionsTab />}
            {activeTab === UserSettingTab.PASSWORD && <PasswordTab />}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
});

export default UserSettingsModal;
