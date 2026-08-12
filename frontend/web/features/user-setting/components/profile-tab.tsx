"use client";

import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Camera, Loader2, Save, User } from "lucide-react";
import { toast } from "react-toastify";
import { useAppSelector } from "@/store/store";
import {
  useUpdateUserProfileMutation,
  useUploadAvatarMutation,
  useUserProfileQuery,
} from "../hooks/useUserSettingQueries";
import { UserProfile } from "../types/user-setting.types";
import {
  getUserSettingErrorMessage,
  getUserSettingValidationErrors,
} from "../utils/user-setting-error";
import { cn } from "@/lib/utils";

const ProfileTab = React.memo(function ProfileTab() {
  const { email } = useAppSelector((state) => state.auth);
  const { data: profileResponse, isLoading } = useUserProfileQuery();
  const updateProfileMutation = useUpdateUserProfileMutation();
  const uploadAvatarMutation = useUploadAvatarMutation();

  const [profileForm, setProfileForm] = useState<UserProfile | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (profileResponse?.data) {
      setProfileForm(profileResponse.data);
    }
  }, [profileResponse]);

  const updateProfileField = (field: keyof UserProfile, value: string) => {
    setProfileForm((current) =>
      current
        ? {
            ...current,
            [field]: value,
          }
        : current,
    );
    setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const handleAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !profileForm) return;

    uploadAvatarMutation.mutate(
      { file, currentProfile: profileForm },
      {
        onSuccess: (response) => {
          setProfileForm((current) =>
            current
              ? {
                  ...current,
                  avatarUrl: response.data.avatarUrl,
                }
              : response.data,
          );
        },
        onError: (error) => {
          console.error(error);
          toast.error(
            getUserSettingErrorMessage(
              error,
              "Could not upload avatar. Please try again.",
            ),
          );
        },
        onSettled: () => {
          if (fileInputRef.current) {
            fileInputRef.current.value = "";
          }
        },
      },
    );
  };

  const handleSaveProfile = () => {
    if (!profileForm) return;
    setErrors({});

    updateProfileMutation.mutate(profileForm, {
      onSuccess: () => {
        toast.success("Profile updated successfully.");
      },
      onError: (error) => {
        console.error(error);
        const validationErrors = getUserSettingValidationErrors(error);

        if (Object.keys(validationErrors).length > 0) {
          setErrors(validationErrors);
          return;
        }

        toast.error(
          getUserSettingErrorMessage(
            error,
            "Something went wrong while saving your profile.",
          ),
        );
      },
    });
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
      <h3 className="text-xl font-black text-slate-800">
        Personal information
      </h3>

      <div className="flex flex-col items-center sm:flex-row sm:items-center gap-5 pb-5 border-b border-slate-100">
        <div className="relative group shrink-0">
          <div className="relative grid h-20 w-20 place-items-center overflow-hidden rounded-full border border-gray-700 bg-white text-2xl font-bold text-white shadow-md">
            {profileForm.avatarUrl ? (
              <Image
                src={profileForm.avatarUrl}
                alt={profileForm.fullName}
                fill
                sizes="80px"
                className="object-cover"
              />
            ) : (
              <User size={30} className="text-gray-700" />
            )}
          </div>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadAvatarMutation.isPending}
            className="absolute inset-0 bg-black/50 text-white opacity-0 group-hover:opacity-100 transition flex items-center justify-center rounded-full cursor-pointer disabled:opacity-50"
            aria-label="Upload avatar"
          >
            {uploadAvatarMutation.isPending ? (
              <Loader2 className="h-6 w-6 animate-spin" />
            ) : (
              <Camera className="h-6 w-6" />
            )}
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
          <p className="text-sm font-bold text-slate-800 rounded-xl w-full sm:w-64 inline-block">
            {profileForm.email || email}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-bold text-slate-700">Full name</label>
          <input
            type="text"
            value={profileForm.fullName || ""}
            onChange={(e) => updateProfileField("fullName", e.target.value)}
            className={cn(
              `rounded-xl border bg-white px-3 py-2 text-sm font-semibold text-slate-800 outline-none focus:ring-2 ${
                errors.fullName
                  ? "border-red-500 focus:border-red-500 focus:ring-red-500/20"
                  : "border-slate-200 focus:border-[var(--color-primary)] focus:ring-[var(--color-primary)]/20"
              }`,
            )}
            placeholder="Enter your full name..."
          />
          {errors.fullName && (
            <p className="text-xs text-red-500">{errors.fullName}</p>
          )}
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-bold text-slate-700">
            Phone number
          </label>
          <input
            type="tel"
            value={profileForm.phoneNumber || ""}
            onChange={(e) => updateProfileField("phoneNumber", e.target.value)}
            className={cn(
              `rounded-xl border bg-white px-3 py-2 text-sm font-semibold text-slate-800 outline-none focus:ring-2 ${
                errors.phoneNumber
                  ? "border-red-500 focus:border-red-500 focus:ring-red-500/20"
                  : "border-slate-200 focus:border-[var(--color-primary)] focus:ring-[var(--color-primary)]/20"
              }`,
            )}
            placeholder="Enter your phone number..."
          />
          {errors.phoneNumber && (
            <p className="text-xs text-red-500">{errors.phoneNumber}</p>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-bold text-slate-700">
          Date of birth
        </label>
        <input
          type="date"
          value={profileForm.dob || ""}
          onChange={(e) => updateProfileField("dob", e.target.value)}
          className={cn(
            `rounded-xl border bg-white px-3 py-2 text-sm font-semibold text-slate-800 outline-none focus:ring-2 w-full sm:w-1/2 ${
              errors.dob
                ? "border-red-500 focus:border-red-500 focus:ring-red-500/20"
                : "border-slate-200 focus:border-[var(--color-primary)] focus:ring-[var(--color-primary)]/20"
            }`,
          )}
        />
        {errors.dob && <p className="text-xs text-red-500">{errors.dob}</p>}
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-bold text-slate-700">Bio</label>
        <textarea
          value={profileForm.bio || ""}
          onChange={(e) => updateProfileField("bio", e.target.value)}
          rows={3}
          className={cn(
            `rounded-xl border bg-white px-3 py-2 text-sm font-semibold text-slate-800 outline-none focus:ring-2 resize-none ${
              errors.bio
                ? "border-red-500 focus:border-red-500 focus:ring-red-500/20"
                : "border-slate-200 focus:border-[var(--color-primary)] focus:ring-[var(--color-primary)]/20"
            }`,
          )}
          placeholder="Write a short introduction about yourself..."
        />
        {errors.bio && <p className="text-xs text-red-500">{errors.bio}</p>}
      </div>

      <button
        onClick={handleSaveProfile}
        disabled={updateProfileMutation.isPending}
        className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--color-primary-dark)] px-4 py-2.5 text-sm font-bold text-white shadow-md transition hover:bg-[var(--color-primary)] disabled:opacity-70 cursor-pointer"
      >
        {updateProfileMutation.isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Save className="h-4 w-4" />
        )}
        {updateProfileMutation.isPending ? "Saving..." : "Save changes"}
      </button>
    </div>
  );
});

export default ProfileTab;
