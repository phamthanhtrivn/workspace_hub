"use client";

import { useState, useEffect } from "react";
import {
  X,
  User,
  Settings,
  Shield,
  Monitor,
  Smartphone,
  LogOut,
  Save,
  Loader2,
  Camera,
} from "lucide-react";
import {
  UserSettingsOverview,
  UserSettings,
  UserProfile,
} from "../types/user-setting.types";
import {
  getUserSettingsOverview,
  updateUserSettings,
} from "../api/user-setting.api";

type UserSettingsModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

export default function UserSettingsModal({
  isOpen,
  onClose,
}: UserSettingsModalProps) {
  const [activeTab, setActiveTab] = useState<
    "profile" | "settings" | "sessions"
  >("profile");
  const [overview, setOverview] = useState<UserSettingsOverview | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [settingsForm, setSettingsForm] = useState<UserSettings | null>(null);
  const [profileForm, setProfileForm] = useState<UserProfile | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadSettings();
    }
  }, [isOpen]);

  const loadSettings = async () => {
    setIsLoading(true);
    try {
      // Mock Data
      setTimeout(() => {
        const mockOverview: UserSettingsOverview = {
          profile: {
            email: "mock@user.com",
            fullName: "Nguyễn Văn Mock",
            avatarUrl: "",
            phoneNumber: "0987654321",
            dob: "1999-01-01",
            bio: "I love coding and design.",
            role: "USER",
            status: "ACTIVE",
            createdAt: new Date().toISOString(),
          },
          settings: {
            theme: "light",
            language: "vi",
            timezone: "Asia/Ho_Chi_Minh",
            emailNotificationEnabled: true,
            pushNotificationEnabled: false,
          },
          sessions: [
            {
              id: "1",
              deviceName: "MacBook Pro M1",
              browser: "Chrome",
              operatingSystem: "macOS",
              location: "Ho Chi Minh City",
              ipAddress: "192.168.1.1",
              expiresAt: new Date(Date.now() + 86400000).toISOString(),
              isCurrentSession: true,
            },
            {
              id: "2",
              deviceName: "iPhone 13",
              browser: "Safari",
              operatingSystem: "iOS",
              location: "Hanoi",
              ipAddress: "192.168.1.2",
              expiresAt: new Date(Date.now() + 86400000).toISOString(),
              isCurrentSession: false,
            },
          ],
        };

        setOverview(mockOverview);
        setSettingsForm(mockOverview.settings);
        setProfileForm(mockOverview.profile);
        setIsLoading(false);
      }, 500);
    } catch (error) {
      console.error("Failed to load settings:", error);
      setIsLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    if (!settingsForm) return;
    setIsSaving(true);
    try {
      setTimeout(() => {
        setOverview((prev) =>
          prev ? { ...prev, settings: settingsForm } : null,
        );
        setIsSaving(false);
        alert("Cập nhật cài đặt thành công (Mock)!");
      }, 500);
    } catch (error) {
      console.error("Failed to save settings:", error);
      setIsSaving(false);
      alert("Đã xảy ra lỗi khi lưu cài đặt.");
    }
  };

  const handleSaveProfile = async () => {
    if (!profileForm) return;
    setIsSavingProfile(true);
    try {
      setTimeout(() => {
        setOverview((prev) =>
          prev ? { ...prev, profile: profileForm } : null,
        );
        setIsSavingProfile(false);
        alert("Cập nhật tài khoản thành công (Mock)!");
      }, 500);
    } catch (error) {
      console.error("Failed to save profile:", error);
      setIsSavingProfile(false);
      alert("Đã xảy ra lỗi khi lưu tài khoản.");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm transition-opacity">
      <div className="flex h-full max-h-[600px] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl animate-in fade-in zoom-in-95 duration-200 md:flex-row">
        {/* Sidebar Tabs */}
        <div className="w-full border-b border-slate-100 bg-slate-50 p-4 md:w-64 md:border-b-0 md:border-r">
          <div className="mb-6 flex items-center justify-between md:mb-8">
            <h2 className="text-xl font-black text-slate-800">Cài Đặt</h2>
            <button
              onClick={onClose}
              className="rounded-lg p-2 text-slate-400 hover:bg-slate-200 hover:text-slate-600 md:hidden"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <nav className="flex space-x-2 overflow-x-auto md:flex-col md:space-x-0 md:space-y-1">
            <button
              onClick={() => setActiveTab("profile")}
              className={`flex shrink-0 items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold transition-colors ${
                activeTab === "profile"
                  ? "bg-white text-[var(--color-primary-dark)] shadow-sm"
                  : "text-slate-600 hover:bg-slate-200/50"
              }`}
            >
              <User className="h-4 w-4" />
              Tài khoản
            </button>
            <button
              onClick={() => setActiveTab("settings")}
              className={`flex shrink-0 items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold transition-colors ${
                activeTab === "settings"
                  ? "bg-white text-[var(--color-primary-dark)] shadow-sm"
                  : "text-slate-600 hover:bg-slate-200/50"
              }`}
            >
              <Settings className="h-4 w-4" />
              Tùy chỉnh
            </button>
            <button
              onClick={() => setActiveTab("sessions")}
              className={`flex shrink-0 items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold transition-colors ${
                activeTab === "sessions"
                  ? "bg-white text-[var(--color-primary-dark)] shadow-sm"
                  : "text-slate-600 hover:bg-slate-200/50"
              }`}
            >
              <Shield className="h-4 w-4" />
              Bảo mật & Phiên
            </button>
          </nav>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 relative">
          <button
            onClick={onClose}
            className="absolute right-6 top-6 hidden rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 md:block cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>

          {isLoading ? (
            <div className="flex h-full items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-[var(--color-primary)]" />
            </div>
          ) : (
            <div className="mx-auto max-w-2xl mt-4">
              {/* Profile Tab */}
              {activeTab === "profile" && profileForm && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
                  <h3 className="text-2xl font-black text-slate-800">
                    Thông tin cá nhân
                  </h3>

                  <div className="flex flex-col sm:flex-row sm:items-center gap-6 pb-6 border-b border-slate-100">
                    <div className="relative group shrink-0">
                      <div className="grid h-24 w-24 place-items-center rounded-full bg-[var(--color-primary-dark)] text-3xl font-bold text-white shadow-md overflow-hidden">
                        {profileForm.avatarUrl ? (
                          <img
                            src={profileForm.avatarUrl}
                            alt="Avatar"
                            className="h-full w-full object-cover"
                          />
                        ) : profileForm.fullName ? (
                          profileForm.fullName.charAt(0)
                        ) : (
                          "W"
                        )}
                      </div>
                      <button className="absolute inset-0 bg-black/50 text-white opacity-0 group-hover:opacity-100 transition flex items-center justify-center rounded-full cursor-pointer">
                        <Camera className="h-6 w-6" />
                      </button>
                    </div>
                    <div>
                      <p className="font-semibold text-slate-500 mb-1">Email</p>
                      <p className="text-lg font-bold text-slate-800 bg-slate-50 px-4 py-2 rounded-xl border border-slate-100 w-full sm:w-64">
                        {profileForm.email}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1">
                      <label className="text-sm font-bold text-slate-700">
                        Họ và Tên
                      </label>
                      <input
                        type="text"
                        value={profileForm.fullName || ""}
                        onChange={(e) =>
                          setProfileForm({
                            ...profileForm,
                            fullName: e.target.value,
                          })
                        }
                        className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20"
                        placeholder="Nhập họ và tên..."
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-sm font-bold text-slate-700">
                        Số điện thoại
                      </label>
                      <input
                        type="tel"
                        value={profileForm.phoneNumber || ""}
                        onChange={(e) =>
                          setProfileForm({
                            ...profileForm,
                            phoneNumber: e.target.value,
                          })
                        }
                        className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20"
                        placeholder="Nhập số điện thoại..."
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-sm font-bold text-slate-700">
                      Ngày sinh
                    </label>
                    <input
                      type="date"
                      value={profileForm.dob || ""}
                      onChange={(e) =>
                        setProfileForm({ ...profileForm, dob: e.target.value })
                      }
                      className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20 w-full sm:w-1/2"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-sm font-bold text-slate-700">
                      Giới thiệu bản thân (Bio)
                    </label>
                    <textarea
                      value={profileForm.bio || ""}
                      onChange={(e) =>
                        setProfileForm({ ...profileForm, bio: e.target.value })
                      }
                      rows={3}
                      className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20 resize-none"
                      placeholder="Một vài dòng giới thiệu về bạn..."
                    />
                  </div>

                  <button
                    onClick={handleSaveProfile}
                    disabled={isSavingProfile}
                    className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--color-primary-dark)] px-4 py-3 text-sm font-bold text-white shadow-md transition hover:bg-[var(--color-primary)] disabled:opacity-70 cursor-pointer"
                  >
                    {isSavingProfile ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    {isSavingProfile ? "Đang lưu..." : "Lưu thay đổi"}
                  </button>
                </div>
              )}

              {/* Settings Tab */}
              {activeTab === "settings" && settingsForm && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
                  <h3 className="text-2xl font-black text-slate-800">
                    Tùy chỉnh hệ thống
                  </h3>

                  <div className="space-y-4">
                    <div className="flex flex-col gap-1">
                      <label className="text-sm font-bold text-slate-700">
                        Giao diện (Theme)
                      </label>
                      <select
                        value={settingsForm.theme}
                        onChange={(e) =>
                          setSettingsForm({
                            ...settingsForm,
                            theme: e.target.value,
                          })
                        }
                        className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-800 outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20"
                      >
                        <option value="light">Sáng (Light)</option>
                        <option value="dark">Tối (Dark)</option>
                        <option value="system">Theo hệ thống</option>
                      </select>
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-sm font-bold text-slate-700">
                        Ngôn ngữ
                      </label>
                      <select
                        value={settingsForm.language}
                        onChange={(e) =>
                          setSettingsForm({
                            ...settingsForm,
                            language: e.target.value,
                          })
                        }
                        className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-800 outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20"
                      >
                        <option value="vi">Tiếng Việt</option>
                        <option value="en">English</option>
                      </select>
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-sm font-bold text-slate-700">
                        Múi giờ
                      </label>
                      <select
                        value={settingsForm.timezone}
                        onChange={(e) =>
                          setSettingsForm({
                            ...settingsForm,
                            timezone: e.target.value,
                          })
                        }
                        className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-800 outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20"
                      >
                        <option value="Asia/Ho_Chi_Minh">
                          Asia/Ho_Chi_Minh (GMT+7)
                        </option>
                        <option value="UTC">UTC</option>
                      </select>
                    </div>

                    <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4">
                      <div>
                        <p className="font-bold text-slate-700">
                          Thông báo qua Email
                        </p>
                        <p className="text-xs font-semibold text-slate-500">
                          Nhận cập nhật công việc qua email
                        </p>
                      </div>
                      <label className="relative inline-flex cursor-pointer items-center">
                        <input
                          type="checkbox"
                          className="peer sr-only"
                          checked={settingsForm.emailNotificationEnabled}
                          onChange={(e) =>
                            setSettingsForm({
                              ...settingsForm,
                              emailNotificationEnabled: e.target.checked,
                            })
                          }
                        />
                        <div className="peer h-6 w-11 rounded-full bg-slate-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-[var(--color-primary)] peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[var(--color-primary)]/20"></div>
                      </label>
                    </div>

                    <button
                      onClick={handleSaveSettings}
                      disabled={isSaving}
                      className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--color-primary-dark)] px-4 py-3 text-sm font-bold text-white shadow-md transition hover:bg-[var(--color-primary)] disabled:opacity-70 cursor-pointer"
                    >
                      {isSaving ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4" />
                      )}
                      {isSaving ? "Đang lưu..." : "Lưu cài đặt"}
                    </button>
                  </div>
                </div>
              )}

              {/* Sessions Tab */}
              {activeTab === "sessions" && overview?.sessions && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
                  <h3 className="text-2xl font-black text-slate-800">
                    Phiên đăng nhập
                  </h3>
                  <p className="text-sm font-semibold text-slate-500">
                    Quản lý các thiết bị đang đăng nhập vào tài khoản của bạn.
                  </p>

                  <div className="space-y-3">
                    {overview.sessions.map((session) => (
                      <div
                        key={session.id}
                        className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="flex items-center gap-4">
                          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-slate-100 text-slate-500">
                            {session.operatingSystem
                              ?.toLowerCase()
                              .includes("mac") ||
                            session.operatingSystem
                              ?.toLowerCase()
                              .includes("windows") ? (
                              <Monitor className="h-5 w-5" />
                            ) : (
                              <Smartphone className="h-5 w-5" />
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-800 flex items-center gap-2">
                              {session.deviceName || "Thiết bị không xác định"}
                              {session.isCurrentSession && (
                                <span className="rounded bg-green-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-green-700">
                                  Hiện tại
                                </span>
                              )}
                            </p>
                            <p className="text-xs font-semibold text-slate-500">
                              {session.browser || "Unknown browser"} trên{" "}
                              {session.operatingSystem || "Unknown OS"}
                            </p>
                            <p className="text-[11px] font-semibold text-slate-400 mt-0.5">
                              {session.location || session.ipAddress} • Hết hạn:{" "}
                              {new Date(session.expiresAt).toLocaleDateString(
                                "vi-VN",
                              )}
                            </p>
                          </div>
                        </div>

                        {!session.isCurrentSession && (
                          <button className="flex items-center justify-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-bold text-red-600 transition hover:bg-red-100 cursor-pointer">
                            <LogOut className="h-3 w-3" />
                            Đăng xuất
                          </button>
                        )}
                      </div>
                    ))}

                    {overview.sessions.length === 0 && (
                      <p className="text-sm text-slate-500 text-center py-4">
                        Không có phiên đăng nhập nào.
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
