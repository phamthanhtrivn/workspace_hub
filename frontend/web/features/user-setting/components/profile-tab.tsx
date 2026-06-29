"use client";

import { useState, useEffect, useRef } from "react";
import { Camera, Save, Loader2 } from "lucide-react";
import { UserProfile } from "../types/user-setting.types";
import {
  getUserProfile,
  updateUserProfile,
  getAvatarPresignedUrl,
} from "../api/user-setting.api";
import { useAppSelector } from "@/store/store";
import { toast } from "react-toastify";
import axios from "axios";

export default function ProfileTab() {
  const { email } = useAppSelector((state) => state.auth);
  const [profileForm, setProfileForm] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    setIsLoading(true);
    try {
      const response = await getUserProfile();
      if (response.success) {
        setProfileForm(response.data);
      }
    } catch (error: any) {
      console.log(error);
      const response = error?.response?.data;
      toast.error(response?.message ?? "Tải thông tin thất bại");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAvatarChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file || !profileForm) return;

    try {
      const response = await getAvatarPresignedUrl(file.name, file.type);
      if (response && response.success) {
        const { presignedUrl, fileUrl } = response.data;

        await axios.put(presignedUrl, file, {
          headers: {
            "Content-Type": file.type,
          },
        });

        setProfileForm({ ...profileForm, avatarUrl: fileUrl });
      }
    } catch (error) {
      console.error(error);
      toast.error("Không thể tải ảnh lên. Vui lòng thử lại.");
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleSaveProfile = async () => {
    if (!profileForm) return;
    setIsSavingProfile(true);
    setErrors({});
    try {
      const response = await updateUserProfile(profileForm);
      if (response && response.success !== false) {
        toast.success("Cập nhật thông tin hồ sơ thành công!");
      }
    } catch (error: any) {
      console.error(error);
      const response = error?.response?.data;
      
      if (response?.errors && Object.keys(response.errors).length > 0) {
        setErrors(response.errors);
        return;
      }

      toast.error(response?.message ?? "Đã xảy ra lỗi khi lưu thông tin.");
    } finally {
      setIsSavingProfile(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-full min-h-[300px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--color-primary)]" />
      </div>
    );
  }

  if (!profileForm) return null;

  return (
    <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2">
      <h3 className="text-xl font-black text-slate-800">Thông tin cá nhân</h3>

      <div className="flex flex-col items-center sm:flex-row sm:items-center gap-5 pb-5 border-b border-slate-100">
        <div className="relative group shrink-0">
          <div className="grid h-20 w-20 place-items-center rounded-full bg-[var(--color-primary-dark)] text-2xl font-bold text-white shadow-md overflow-hidden">
            {profileForm.avatarUrl ? (
              <img
                src={profileForm.avatarUrl}
                alt="Avatar"
                className="h-full w-full object-cover"
              />
            ) : profileForm.fullName ? (
              profileForm.fullName.charAt(0).toUpperCase()
            ) : (
              "W"
            )}
          </div>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="absolute inset-0 bg-black/50 text-white opacity-0 group-hover:opacity-100 transition flex items-center justify-center rounded-full cursor-pointer"
          >
            <Camera className="h-6 w-6" />
          </button>
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept="image/*"
            onChange={handleAvatarChange}
          />
        </div>
        <div className="text-center sm:text-left w-full sm:w-auto">
          <p className="font-semibold text-slate-500 mb-1">Email</p>
          <p className="text-sm  font-bold text-slate-800 rounded-xlw-full sm:w-64 inline-block">
            {email}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-bold text-slate-700">Họ và Tên</label>
          <input
            type="text"
            value={profileForm.fullName || ""}
            onChange={(e) => {
              setProfileForm({ ...profileForm, fullName: e.target.value });
              setErrors((prev) => ({ ...prev, fullName: "" }));
            }}
            className={`rounded-xl border bg-white px-3 py-2 text-sm font-semibold text-slate-800 outline-none focus:ring-2 ${
              errors.fullName
                ? "border-red-500 focus:border-red-500 focus:ring-red-500/20"
                : "border-slate-200 focus:border-[var(--color-primary)] focus:ring-[var(--color-primary)]/20"
            }`}
            placeholder="Nhập họ và tên..."
          />
          {errors.fullName && (
            <p className="text-xs text-red-500">{errors.fullName}</p>
          )}
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-bold text-slate-700">
            Số điện thoại
          </label>
          <input
            type="tel"
            value={profileForm.phoneNumber || ""}
            onChange={(e) => {
              setProfileForm({ ...profileForm, phoneNumber: e.target.value });
              setErrors((prev) => ({ ...prev, phoneNumber: "" }));
            }}
            className={`rounded-xl border bg-white px-3 py-2 text-sm font-semibold text-slate-800 outline-none focus:ring-2 ${
              errors.phoneNumber
                ? "border-red-500 focus:border-red-500 focus:ring-red-500/20"
                : "border-slate-200 focus:border-[var(--color-primary)] focus:ring-[var(--color-primary)]/20"
            }`}
            placeholder="Nhập số điện thoại..."
          />
          {errors.phoneNumber && (
            <p className="text-xs text-red-500">{errors.phoneNumber}</p>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-bold text-slate-700">Ngày sinh</label>
        <input
          type="date"
          value={profileForm.dob || ""}
          onChange={(e) => {
            setProfileForm({ ...profileForm, dob: e.target.value });
            setErrors((prev) => ({ ...prev, dob: "" }));
          }}
          className={`rounded-xl border bg-white px-3 py-2 text-sm font-semibold text-slate-800 outline-none focus:ring-2 w-full sm:w-1/2 ${
            errors.dob
              ? "border-red-500 focus:border-red-500 focus:ring-red-500/20"
              : "border-slate-200 focus:border-[var(--color-primary)] focus:ring-[var(--color-primary)]/20"
          }`}
        />
        {errors.dob && (
          <p className="text-xs text-red-500">{errors.dob}</p>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-bold text-slate-700">
          Giới thiệu bản thân (Bio)
        </label>
        <textarea
          value={profileForm.bio || ""}
          onChange={(e) => {
            setProfileForm({ ...profileForm, bio: e.target.value });
            setErrors((prev) => ({ ...prev, bio: "" }));
          }}
          rows={3}
          className={`rounded-xl border bg-white px-3 py-2 text-sm font-semibold text-slate-800 outline-none focus:ring-2 resize-none ${
            errors.bio
              ? "border-red-500 focus:border-red-500 focus:ring-red-500/20"
              : "border-slate-200 focus:border-[var(--color-primary)] focus:ring-[var(--color-primary)]/20"
          }`}
          placeholder="Một vài dòng giới thiệu về bạn..."
        />
        {errors.bio && (
          <p className="text-xs text-red-500">{errors.bio}</p>
        )}
      </div>

      <button
        onClick={handleSaveProfile}
        disabled={isSavingProfile}
        className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--color-primary-dark)] px-4 py-2.5 text-sm font-bold text-white shadow-md transition hover:bg-[var(--color-primary)] disabled:opacity-70 cursor-pointer"
      >
        {isSavingProfile ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Save className="h-4 w-4" />
        )}
        {isSavingProfile ? "Đang lưu..." : "Lưu thay đổi"}
      </button>
    </div>
  );
}
