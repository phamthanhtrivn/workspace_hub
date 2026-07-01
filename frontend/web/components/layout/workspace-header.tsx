"use client";

import { useState, useRef, useEffect } from "react";
import { Menu, Search, Bell, Settings, LogOut, User } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAppDispatch, useAppSelector } from "@/store/store";
import { clearCredentials } from "@/store/auth/auth-slice";
import { logoutApi } from "@/features/auth/api/auth.api";
import { getUserProfile } from "@/features/user-setting/api/user-setting.api";
import { UserProfile } from "@/features/user-setting/types/user-setting.types";
import Image from "next/image";
import { toast } from "react-toastify";

interface WorkspaceHeaderProps {
  currentTitle: string;
  onMenuClick: () => void;
  onOpenSettings: (tab: "profile" | "settings" | "sessions") => void;
}

export default function WorkspaceHeader({
  currentTitle,
  onMenuClick,
  onOpenSettings,
}: WorkspaceHeaderProps) {
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const router = useRouter();
  const dispatch = useAppDispatch();
  const { email } = useAppSelector((state) => state.auth);

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
      dispatch(clearCredentials());
      setIsLoggingOut(false);
      router.push("/login");
    }
  };

  // Close dropdown when clicking outside
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
    <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-gray-50 px-4 py-3 backdrop-blur-xl sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
        {/* Left: Breadcrumbs & Mobile Menu */}
        <div className="flex min-w-0 items-center gap-3">
          <button
            onClick={onMenuClick}
            className="-ml-2 rounded-xl p-2 text-slate-600 hover:bg-slate-100 lg:hidden cursor-pointer"
          >
            <Menu className="h-6 w-6" />
          </button>
          <div className="min-w-0">
            <div className="flex items-center text-xs font-bold uppercase tracking-[0.18em] text-[var(--color-secondary)]">
              <span>Workspace</span>
              <span className="mx-2 text-slate-300">/</span>
              <span className="truncate">{currentTitle}</span>
            </div>
            <h2 className="truncate text-xl font-black text-[var(--color-primary-dark)]">
              {currentTitle}
            </h2>
          </div>
        </div>

        {/* Middle: Search Bar */}
        <div className="hidden flex-1 max-w-md items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-400 shadow-sm transition hover:border-slate-300 md:flex cursor-text">
          <Search className="h-4 w-4" strokeWidth={2} />
          <span className="flex-1 text-left">Search workspace...</span>
          <div className="flex items-center gap-1 rounded bg-slate-100 px-1.5 py-0.5 text-xs font-bold text-slate-400">
            <span>Ctrl</span>
            <span>K</span>
          </div>
        </div>

        {/* Right: Actions & User Profile */}
        <div className="flex items-center gap-2 lg:gap-3">
          {/* Notifications Button */}
          <button
            className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--color-secondary)]/20 cursor-pointer"
            aria-label="Notifications"
          >
            <Bell className="h-5 w-5" />
          </button>

          {/* User Profile Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
              className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-white text-sm font-black text-[var(--color-primary-dark)] shadow-sm ring-1 ring-slate-200 transition hover:bg-slate-50 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--color-secondary)]/20 cursor-pointer"
              aria-label="Open user menu"
            >
              {userProfile.avatarUrl ? (
                <Image
                  src={userProfile.avatarUrl}
                  alt="Avatar"
                  width={44}
                  height={44}
                  className="rounded-full"
                />
              ) : (
                <User size={22} className="text-gray-700" />
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
        </div>
      </div>
    </header>
  );
}
