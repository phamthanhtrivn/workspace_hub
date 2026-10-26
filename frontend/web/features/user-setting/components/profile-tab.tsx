"use client";

import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Camera, Save, User } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { CustomDatePicker } from "@/components/ui/custom/custom-date-picker";
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
import { QueryFeedback } from "@/components/common/query-feedback";
import { useSettingsDraft } from "../hooks/use-settings-draft";
import { UserSettingTab } from "../types/settings.enums";
import { SettingInput, SettingTextarea } from "./ui/setting-form-controls";
import { Spinner } from "@/components/ui/spinner";

const draftValue = (profile: UserProfile | null) => JSON.stringify(profile ? [profile.fullName, profile.phoneNumber, profile.dob, profile.bio] : null);

const ProfileTab = React.memo(function ProfileTab() {
  const { email } = useAppSelector((state) => state.auth);
  const profileQuery = useUserProfileQuery();
  const { data: profileResponse, isLoading } = profileQuery;
  const updateProfileMutation = useUpdateUserProfileMutation();
  const uploadAvatarMutation = useUploadAvatarMutation();

  const [profileForm, setProfileForm] = useState<UserProfile | null>(null);
  const [savedValue, setSavedValue] = useState(draftValue(null));
  const dirty = profileForm !== null && draftValue(profileForm) !== savedValue;
  const formRef = useRef<HTMLFormElement>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (profileResponse?.data) {
      if (!dirty) { setProfileForm(profileResponse.data); setSavedValue(draftValue(profileResponse.data)); }
      else setProfileForm(current => current && current.avatarUrl !== profileResponse.data.avatarUrl ? { ...current, avatarUrl: profileResponse.data.avatarUrl } : current);
    }
  }, [profileResponse, dirty]);

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

  const handleSaveProfile = async () => {
    if (!profileForm || updateProfileMutation.isPending || uploadAvatarMutation.isPending) return false;
    setErrors({});
    try {
      const response = await updateProfileMutation.mutateAsync(profileForm);
      setProfileForm(response.data); setSavedValue(draftValue(response.data));
      toast.success("Profile updated successfully.");
      return true;
    } catch (error) {
      const validationErrors = getUserSettingValidationErrors(error);
      if (Object.keys(validationErrors).length) {
        setErrors(validationErrors);
        requestAnimationFrame(() => formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus());
      } else toast.error(getUserSettingErrorMessage(error, "Could not save your profile. Please try again."));
      return false;
    }
  };
  useSettingsDraft(UserSettingTab.PROFILE, {
    dirty, pending: updateProfileMutation.isPending || uploadAvatarMutation.isPending,
    save: handleSaveProfile,
    discard: () => { setProfileForm(profileResponse?.data ?? null); setSavedValue(draftValue(profileResponse?.data ?? null)); setErrors({}); },
  });

  if (!profileForm) return <QueryFeedback label="your profile" pending={isLoading} error={profileQuery.isError} retrying={profileQuery.isFetching} onRetry={() => profileQuery.refetch()} />;

  return (
    <form ref={formRef} noValidate onSubmit={event => { event.preventDefault(); void handleSaveProfile(); }} className="space-y-5 animate-in fade-in slide-in-from-bottom-2">
      <QueryFeedback label="your profile" error={profileQuery.isError} retrying={profileQuery.isFetching} onRetry={() => profileQuery.refetch()} />
      <h3 className="text-section-title font-semibold text-foreground">
        Personal information
      </h3>

      <div className="flex flex-col items-center sm:flex-row sm:items-center gap-5 pb-5 border-b border-border">
        <div className="relative group shrink-0">
          <div className="relative grid h-20 w-20 place-items-center overflow-hidden rounded-full border border-input bg-card text-2xl font-semibold text-foreground">
            {profileForm.avatarUrl ? (
              <Image
                src={profileForm.avatarUrl}
                alt={profileForm.fullName}
                fill
                sizes="80px"
                className="object-cover"
              />
            ) : (
              <User size={30} className="text-foreground" />
            )}
          </div>
          <Button aria-busy={uploadAvatarMutation.isPending || undefined} variant="unstyled"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadAvatarMutation.isPending}
            className="absolute inset-0 bg-overlay/80 text-media-foreground opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 [@media(hover:none)]:opacity-100 transition flex items-center justify-center rounded-full cursor-pointer disabled:opacity-50"
            aria-label="Upload avatar"
          >
            {uploadAvatarMutation.isPending ? (
              <Spinner size={24} />
            ) : (
              <Camera className="h-6 w-6" />
            )}
          </Button>
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept="image/*"
            onChange={handleAvatarChange}
          />
        </div>
        <div className="text-center sm:text-left w-full sm:w-auto">
          <p className="font-semibold text-muted-foreground mb-1">Email</p>
          <p className="text-sm font-semibold text-foreground rounded-panel w-full sm:w-64 inline-block">
            {profileForm.email || email}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <SettingInput
          label="Full name"
          type="text"
          value={profileForm.fullName || ""}
          onChange={(e) => updateProfileField("fullName", e.target.value)}
          placeholder="Enter your full name..."
          error={errors.fullName}
        />

        <SettingInput
          label="Phone number"
          type="tel"
          value={profileForm.phoneNumber || ""}
          onChange={(e) => updateProfileField("phoneNumber", e.target.value)}
          placeholder="Enter your phone number..."
          error={errors.phoneNumber}
        />
      </div>

      <div className="space-y-1 w-full sm:w-1/2">
        <label htmlFor="profile-dob" className="text-sm font-semibold">Date of birth</label>
        <CustomDatePicker
          disabled={updateProfileMutation.isPending || uploadAvatarMutation.isPending}
          id="profile-dob"
          ariaLabel="Date of birth"
          value={profileForm.dob || ""}
          onChange={(dob) => updateProfileField("dob", dob)}
          invalid={Boolean(errors.dob)}
          descriptionId={errors.dob ? "profile-dob-error" : undefined}
          triggerClassName="h-10"
        />
        {errors.dob && <p id="profile-dob-error" role="alert" className="text-xs text-destructive-content">{errors.dob}</p>}
      </div>

      <SettingTextarea
        label="Bio"
        value={profileForm.bio || ""}
        onChange={(e) => updateProfileField("bio", e.target.value)}
        rows={3}
        placeholder="Write a short introduction about yourself..."
        error={errors.bio}
      />

      <Button aria-busy={updateProfileMutation.isPending || undefined}
        type="submit"
        disabled={updateProfileMutation.isPending || uploadAvatarMutation.isPending}
        className="mt-5 flex h-11 w-full items-center justify-center gap-2 rounded-control bg-primary text-sm font-semibold text-primary-foreground transition hover:bg-primary disabled:opacity-70 cursor-pointer"
      >
        {updateProfileMutation.isPending ? (
          <Spinner tone="inherit" />
        ) : (
          <Save className="h-4 w-4" />
        )}
        {updateProfileMutation.isPending ? "Saving..." : "Save changes"}
      </Button>
    </form>
  );
});

export default ProfileTab;
