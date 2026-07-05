"use client";

import { useState, useRef, useEffect } from "react";
import { User, Settings, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { toast } from "react-toastify";
import { useAppDispatch, useAppSelector } from "@/store/store";

import { clearCredentials } from "@/store/auth/auth-slice";
import { logoutApi } from "@/features/auth/api/auth.api";
import { getUserProfile } from "@/features/user-setting/api/user-setting.api";
import { UserProfile } from "@/features/user-setting/types/user-setting.types";
import { notificationSocketService } from "@/features/notification/api/notification-socket.service";

interface UserProfileDropdownProps {
  onOpenSettings: (tab: "profile" | "settings" | "sessions") => void;
}

export default function UserProfileDropdown({
  onOpenSettings,
}: UserProfileDropdownProps) {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { email } = useAppSelector((state) => state.auth);

  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [userProfile, setUserProfile] = useState<UserProfile>(
    {} as UserProfile,
  );
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await getUserProfile();
        if (response.success && response.data) {
          setUserProfile(response.data);
        }
      } catch (error) {
        console.error("Failed to load profile:", error);
      }
    };
    fetchProfile();
  }, []);

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      await logoutApi();
      toast.success("Đăng xuất thành công");
    } catch (error) {
      console.error("Logout error:", error);
      toast.error("Đăng xuất thất bại");
    } finally {
      notificationSocketService.disconnect();
      dispatch(clearCredentials());
      setIsLoggingOut(false);
      router.push("/login");
    }
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
        onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
        className="grid h-11 w-11 shrink-0 place-items-center bg-gray-200 rounded-full text-sm font-black text-[var(--color-primary-dark)] shadow-sm ring-1 ring-slate-200 transition hover:bg-gray-300 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--color-secondary)]/20 cursor-pointer"
        aria-label="Open user menu"
      >
        {userProfile.avatarUrl ? (
          <Image
            src={userProfile.avatarUrl}
            alt="Avatar"
            fill
            className="rounded-full"
          />
        ) : (
          <User size={22} className=" text-gray-700 rounded-full" />
        )}
      </button>

      {isUserDropdownOpen && (
        <div className="absolute right-0 mt-2 w-56 origin-top-right rounded-2xl border border-slate-100 bg-white p-2 shadow-lg ring-1 ring-black/5 focus:outline-none animate-in fade-in slide-in-from-top-2">
          <div className="px-3 py-2 border-b border-slate-100 mb-1">
            <p className="text-sm font-bold text-slate-800">{}</p>
            <p className="text-xs font-semibold text-slate-500 truncate">
              {email || "email@example.com"}
            </p>
          </div>

          <div className="flex flex-col gap-1">
            <button
              onClick={() => {
                setIsUserDropdownOpen(false);
                onOpenSettings("profile");
              }}
              className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 hover:text-[var(--color-primary-dark)] transition cursor-pointer"
            >
              <User className="h-4 w-4" />
              Hồ sơ cá nhân
            </button>
            <button
              onClick={() => {
                setIsUserDropdownOpen(false);
                onOpenSettings("settings");
              }}
              className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 hover:text-[var(--color-primary-dark)] transition cursor-pointer"
            >
              <Settings className="h-4 w-4" />
              Cài đặt chung
            </button>
            <button
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 transition cursor-pointer mt-1 disabled:opacity-50"
            >
              <LogOut className="h-4 w-4" />
              {isLoggingOut ? "Đang đăng xuất..." : "Đăng xuất"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
