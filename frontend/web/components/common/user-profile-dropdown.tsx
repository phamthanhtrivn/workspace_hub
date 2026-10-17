"use client";

import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { LogOut, Settings, User } from "lucide-react";
import { toast } from "sonner";
import { useAppDispatch, useAppSelector } from "@/store/store";
import { clearCredentials } from "@/store/auth/auth-slice";
import { clearLocalPomodoroData } from "@/features/pomodoro/utils/pomodoro-local-storage";
import { useLogoutMutation } from "@/features/auth/hooks/useAuthMutations";
import { useQueryClient } from "@tanstack/react-query";
import { AuthRouteTarget } from "@/features/auth/types/auth.constants";
import { getAuthErrorMessage } from "@/features/auth/utils/auth-error";
import { socketService } from "@/features/chat/api/chat-socket.service";
import { notificationSocketService } from "@/features/notification/api/notification-socket.service";
import { useUserProfileQuery } from "@/features/user-setting/hooks/useUserSettingQueries";
import { UserSettingTab } from "@/features/user-setting/types/settings.enums";

interface UserProfileDropdownProps {
  onOpenSettings: (tab: UserSettingTab) => void;
}

const UserProfileDropdown = React.memo(function UserProfileDropdown({
  onOpenSettings,
}: UserProfileDropdownProps) {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const logoutMutation = useLogoutMutation();
  const queryClient = useQueryClient();
  const {
    userId,
    email,
    fullName: authFullName,
    avatarUrl: authAvatarUrl,
  } = useAppSelector((state) => state.auth);
  const { data: profileResponse } = useUserProfileQuery();

  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const userProfile = profileResponse?.data;
  const avatarUrl = userProfile?.avatarUrl || authAvatarUrl;
  const fullName = userProfile?.fullName || authFullName;

  const finishLogout = () => {
    if (userId) clearLocalPomodoroData(userId);
    notificationSocketService.disconnect();
    socketService.disconnect();
    dispatch(clearCredentials());
    queryClient.clear();
    router.push(AuthRouteTarget.LOGIN);
  };

  const handleLogout = () => {
    logoutMutation.mutate(undefined, {
      onSuccess: () => {
        toast.success("Signed out successfully");
      },
      onError: (error) => {
        console.error("Logout error:", error);
        toast.error(
          getAuthErrorMessage(
            error,
            "Sign out failed",
          ),
        );
      },
      onSettled: finishLogout,
    });
  };

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsUserDropdownOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsUserDropdownOpen((prev) => !prev)}
        className="relative grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-full bg-accent text-sm font-semibold text-foreground ring-1 ring-ring transition hover:bg-border focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring cursor-pointer"
        aria-label="Open user menu"
      >
        {avatarUrl ? (
          <Image
            src={avatarUrl}
            alt={fullName || "User"}
            fill
            className="rounded-full object-cover"
            sizes="44px"
          />
        ) : (
          <User size={22} className="text-foreground rounded-full" />
        )}
      </button>

      {isUserDropdownOpen && (
        <div className="absolute right-0 z-50 mt-2 w-56 origin-top-right rounded-panel border border-border bg-card p-2 ring-1 ring-foreground/5 focus:outline-none animate-in fade-in slide-in-from-top-2 shadow-panel">
          <div className="px-3 py-2 border-b border-border mb-1">
            <p className="truncate text-sm font-semibold text-foreground">
              {fullName || "Workspace User"}
            </p>
            <p className="text-xs font-semibold text-muted-foreground truncate">
              {userProfile?.email || email || ""}
            </p>
          </div>

          <div className="flex flex-col gap-1">
            <button
              onClick={() => {
                setIsUserDropdownOpen(false);
                triggerRef.current?.focus();
                onOpenSettings(UserSettingTab.PROFILE);
              }}
              className="flex w-full items-center gap-2 rounded-control px-3 py-2 text-sm font-semibold text-muted-foreground hover:bg-background hover:text-foreground transition cursor-pointer"
            >
              <User className="h-4 w-4" />
              Profile
            </button>
            <button
              onClick={() => {
                setIsUserDropdownOpen(false);
                triggerRef.current?.focus();
                onOpenSettings(UserSettingTab.GENERAL);
              }}
              className="flex w-full items-center gap-2 rounded-control px-3 py-2 text-sm font-semibold text-muted-foreground hover:bg-background hover:text-foreground transition cursor-pointer"
            >
              <Settings className="h-4 w-4" />
              Settings
            </button>
            <button
              onClick={handleLogout}
              disabled={logoutMutation.isPending}
              className="flex w-full items-center gap-2 rounded-control px-3 py-2 text-sm font-semibold text-destructive hover:bg-destructive-soft transition cursor-pointer mt-1 disabled:opacity-50"
            >
              <LogOut className="h-4 w-4" />
              {logoutMutation.isPending ? "Signing out..." : "Sign Out"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
});

export default UserProfileDropdown;
