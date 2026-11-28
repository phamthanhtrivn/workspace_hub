"use client";
import { UserAvatar } from "@/components/common/user-avatar";
import { useId as useControlledPopupId } from "react";

import React, { useRef, useState } from "react";

import { useWorkspaceHelp } from "@/features/help/hooks/use-workspace-help";
import { ChevronDown, HelpCircle, LogOut, Settings, User } from "lucide-react";
import { useAppSelector } from "@/store/store";
import { useSignOut } from "@/features/auth/hooks/use-sign-out";
import { SIGN_OUT_COPY } from "@/features/auth/types/auth.constants";
import { useUserProfileQuery } from "@/features/user-setting/hooks/useUserSettingQueries";
import { UserSettingTab } from "@/features/user-setting/types/settings.enums";
import { Button } from "@/components/ui/button";
import { AnchoredMenu } from "@/components/ui/anchored-popup";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";

interface UserProfileDropdownProps {
  onOpenSettings: (tab: UserSettingTab) => void;
}

const UserProfileDropdown = React.memo(function UserProfileDropdown({
  onOpenSettings,
}: UserProfileDropdownProps) {
  const controlledPopupId = useControlledPopupId();
  const { signOut, isSigningOut } = useSignOut();
  const {
    email,
    fullName: authFullName,
    avatarUrl: authAvatarUrl,
  } = useAppSelector((state) => state.auth);
  const { data: profileResponse } = useUserProfileQuery();

  const { openHelp } = useWorkspaceHelp();
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const userProfile = profileResponse?.data;
  const avatarUrl = userProfile ? userProfile.avatarUrl : authAvatarUrl;
  const fullName = userProfile?.fullName || authFullName;

  return (
    <div className="relative" ref={dropdownRef}>
      <Button aria-expanded={isUserDropdownOpen} aria-controls={`${controlledPopupId}-isUserDropdownOpen`} aria-haspopup="menu" variant="unstyled"
        ref={triggerRef}
        type="button"
        onClick={() => setIsUserDropdownOpen((prev) => !prev)}
        className="flex h-11 shrink-0 items-center gap-2 rounded-control px-1.5 text-sm font-semibold text-foreground transition-colors hover:bg-accent"
        aria-label="Open user menu"
      >
        <span className="relative size-9 shrink-0 overflow-hidden rounded-full ring-2 ring-info-soft">
          <UserAvatar
            src={avatarUrl}
            alt={fullName || "User"}
            fill
            className="rounded-full object-cover"
            sizes="36px"
          />
        </span>
        <ChevronDown aria-hidden="true" className={`hidden size-3.5 text-muted-foreground transition-transform motion-reduce:transition-none sm:block ${isUserDropdownOpen ? "rotate-180" : ""}`} />
      </Button>

      {isUserDropdownOpen && (
        <AnchoredMenu id={`${controlledPopupId}-isUserDropdownOpen`} onClose={() => setIsUserDropdownOpen(false)} side="bottom" align="end" aria-label="User menu" className="z-50 w-56 rounded-panel border border-border bg-card p-2 ring-1 ring-foreground/5 focus:outline-none animate-in fade-in slide-in-from-top-2 shadow-panel">
          <div className="px-3 py-2 border-b border-border mb-1">
            <p className="truncate text-sm font-semibold text-foreground">
              {fullName || "Workspace User"}
            </p>
            <p className="text-xs font-semibold text-muted-foreground truncate">
              {userProfile?.email || email || ""}
            </p>
          </div>

          <div className="flex flex-col gap-1">
            <DropdownMenuItem closeOnClick={false}
              onClick={() => {
                setIsUserDropdownOpen(false);
                triggerRef.current?.focus();
                onOpenSettings(UserSettingTab.PROFILE);
              }}
              className="flex w-full items-center gap-2 rounded-control px-3 py-2 text-sm font-semibold text-muted-foreground hover:bg-background hover:text-foreground transition cursor-pointer"
            >
              <User className="h-4 w-4" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem closeOnClick={false}
              onClick={() => {
                setIsUserDropdownOpen(false);
                triggerRef.current?.focus();
                onOpenSettings(UserSettingTab.GENERAL);
              }}
              className="flex w-full items-center gap-2 rounded-control px-3 py-2 text-sm font-semibold text-muted-foreground hover:bg-background hover:text-foreground transition cursor-pointer"
            >
              <Settings className="h-4 w-4" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuItem closeOnClick={false} onClick={() => { setIsUserDropdownOpen(false); triggerRef.current?.focus(); openHelp(); }}><HelpCircle className="size-4" />Help & shortcuts<kbd className="ml-auto text-xs text-muted-foreground">?</kbd></DropdownMenuItem>
            <DropdownMenuItem closeOnClick={false}
              onClick={signOut}
              disabled={isSigningOut}
              className="flex w-full items-center gap-2 rounded-control px-3 py-2 text-sm font-semibold text-destructive-content hover:bg-destructive-soft transition cursor-pointer mt-1 disabled:opacity-50"
            >
              <LogOut className="h-4 w-4" />
              {isSigningOut ? SIGN_OUT_COPY.pending : SIGN_OUT_COPY.label}
            </DropdownMenuItem>
          </div>
        </AnchoredMenu>
      )}
    </div>
  );
});

export default UserProfileDropdown;
