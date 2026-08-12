"use client";

import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { LogOut, Settings, User } from "lucide-react";
import { toast } from "react-toastify";
import { useAppDispatch, useAppSelector } from "@/store/store";
import { clearCredentials } from "@/store/auth/auth-slice";
import { useLogoutMutation } from "@/features/auth/hooks/useAuthMutations";
import { AuthRouteTarget } from "@/features/auth/types/auth.constants";
import { getAuthErrorMessage } from "@/features/auth/utils/auth-error";
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
  const { email } = useAppSelector((state) => state.auth);
  const { data: profileResponse } = useUserProfileQuery();

  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const userProfile = profileResponse?.data;

  const finishLogout = () => {
    notificationSocketService.disconnect();
    dispatch(clearCredentials());
    router.push(AuthRouteTarget.LOGIN);
  };

  const handleLogout = () => {
    logoutMutation.mutate(undefined, {
      onSuccess: () => {
        toast.success("Signed out successfully");
      },
      onError: (error) => {
        console.error("Logout error:", error);
        toast.error(getAuthErrorMessage(error, "Sign out failed"));
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
        type="button"
        onClick={() => setIsUserDropdownOpen((prev) => !prev)}
        className="relative grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-full bg-gray-200 text-sm font-black text-[var(--color-primary-dark)] shadow-sm ring-1 ring-slate-200 transition hover:bg-gray-300 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--color-secondary)]/20 cursor-pointer"
        aria-label="Open user menu"
      >
        {userProfile?.avatarUrl ? (
          <Image
            src={userProfile.avatarUrl}
            alt={userProfile.fullName}
            fill
            className="rounded-full object-cover"
            sizes="44px"
          />
        ) : (
          <User size={22} className="text-gray-700 rounded-full" />
        )}
      </button>

      {isUserDropdownOpen && (
        <div className="absolute right-0 mt-2 w-56 origin-top-right rounded-2xl border border-slate-100 bg-white p-2 shadow-lg ring-1 ring-black/5 focus:outline-none animate-in fade-in slide-in-from-top-2">
          <div className="px-3 py-2 border-b border-slate-100 mb-1">
            <p className="truncate text-sm font-bold text-slate-800">
              {userProfile?.fullName || "Workspace user"}
            </p>
            <p className="text-xs font-semibold text-slate-500 truncate">
              {userProfile?.email || email || "email@example.com"}
            </p>
          </div>

          <div className="flex flex-col gap-1">
            <button
              onClick={() => {
                setIsUserDropdownOpen(false);
                onOpenSettings(UserSettingTab.PROFILE);
              }}
              className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 hover:text-[var(--color-primary-dark)] transition cursor-pointer"
            >
              <User className="h-4 w-4" />
              Profile
            </button>
            <button
              onClick={() => {
                setIsUserDropdownOpen(false);
                onOpenSettings(UserSettingTab.GENERAL);
              }}
              className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 hover:text-[var(--color-primary-dark)] transition cursor-pointer"
            >
              <Settings className="h-4 w-4" />
              General settings
            </button>
            <button
              onClick={handleLogout}
              disabled={logoutMutation.isPending}
              className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 transition cursor-pointer mt-1 disabled:opacity-50"
            >
              <LogOut className="h-4 w-4" />
              {logoutMutation.isPending ? "Signing out..." : "Sign out"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
});

export default UserProfileDropdown;
