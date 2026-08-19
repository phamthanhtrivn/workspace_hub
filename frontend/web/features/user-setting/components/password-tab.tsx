"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { KeyRound, Loader2, ShieldAlert, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { OTP_RESEND_COOLDOWN_SEC } from "../types/settings.enums";
import {
  useSendPasswordOtpMutation,
  useSetFirstPasswordMutation,
  useUpdatePasswordMutation,
  useUserProfileQuery,
} from "../hooks/useUserSettingQueries";
import { getUserSettingErrorMessage } from "../utils/user-setting-error";
import PasswordInput from "./password-input";

interface PasswordForm {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

const EMPTY_PW_FORM: PasswordForm = {
  currentPassword: "",
  newPassword: "",
  confirmPassword: "",
};

const PasswordTab = React.memo(function PasswordTab() {
  const { data: profileResponse, isLoading } = useUserProfileQuery();
  const sendOtpMutation = useSendPasswordOtpMutation();
  const setFirstPasswordMutation = useSetFirstPasswordMutation();
  const updatePasswordMutation = useUpdatePasswordMutation();

  const [pwForm, setPwForm] = useState<PasswordForm>(EMPTY_PW_FORM);
  const [pwErrors, setPwErrors] = useState<Record<string, string>>({});

  // OTP flow state — only active for Google users (hasPassword === false)
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpCooldown, setOtpCooldown] = useState(0);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(
    () => () => {
      if (cooldownRef.current) clearInterval(cooldownRef.current);
    },
    [],
  );

  const startCooldown = useCallback(() => {
    setOtpCooldown(OTP_RESEND_COOLDOWN_SEC);
    cooldownRef.current = setInterval(() => {
      setOtpCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(cooldownRef.current!);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  const updatePwField = (field: keyof PasswordForm, value: string) => {
    setPwForm((f) => ({ ...f, [field]: value }));
    setPwErrors((e) => ({ ...e, [field]: "" }));
  };

  const validateForm = (hasPassword: boolean): boolean => {
    const errs: Record<string, string> = {};

    if (hasPassword && !pwForm.currentPassword) {
      errs.currentPassword = "Current password is required";
    }
    if (!pwForm.newPassword) {
      errs.newPassword = "New password is required";
    } else if (pwForm.newPassword.length < 8) {
      errs.newPassword = "Password must be at least 8 characters";
    }
    if (!pwForm.confirmPassword) {
      errs.confirmPassword = "Please confirm your new password";
    } else if (pwForm.newPassword !== pwForm.confirmPassword) {
      errs.confirmPassword = "Passwords do not match";
    }
    if (!hasPassword && !otp) {
      errs.otp = "OTP is required";
    }

    setPwErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSendOtp = () => {
    sendOtpMutation.mutate(undefined, {
      onSuccess: () => {
        setOtpSent(true);
        startCooldown();
        toast.success("OTP sent! Check your email.");
      },
      onError: (error) => {
        toast.error(
          getUserSettingErrorMessage(
            error,
            "Failed to send OTP. Please try again.",
          ),
        );
      },
    });
  };

  const handleSetFirstPassword = () => {
    if (!validateForm(false)) return;

    setFirstPasswordMutation.mutate(
      {
        otp,
        newPassword: pwForm.newPassword,
        confirmPassword: pwForm.confirmPassword,
      },
      {
        onSuccess: () => {
          toast.success(
            "Password set successfully! Your other sessions have been signed out.",
          );
          setPwForm(EMPTY_PW_FORM);
          setOtp("");
          setOtpSent(false);
        },
        onError: (error) => {
          toast.error(
            getUserSettingErrorMessage(
              error,
              "Failed to set password. Please try again.",
            ),
          );
        },
      },
    );
  };

  const handleUpdatePassword = () => {
    if (!validateForm(true)) return;

    updatePasswordMutation.mutate(
      {
        currentPassword: pwForm.currentPassword,
        newPassword: pwForm.newPassword,
        confirmPassword: pwForm.confirmPassword,
      },
      {
        onSuccess: () => {
          toast.success(
            "Password updated! Your other sessions have been signed out.",
          );
          setPwForm(EMPTY_PW_FORM);
        },
        onError: (error) => {
          toast.error(
            getUserSettingErrorMessage(error, "Failed to update password."),
          );
        },
      },
    );
  };

  if (isLoading) {
    return (
      <div className="flex h-full min-h-[300px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--color-primary)]" />
      </div>
    );
  }

  const hasPassword = profileResponse?.data?.hasPassword ?? false;
  const email = profileResponse?.data?.email ?? "";

  return (
    <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2">
      {/* Warning banner — only for Google users without a password */}
      {!hasPassword && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3">
          <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
          <div>
            <p className="text-sm font-bold text-amber-800">
              Your account doesn&apos;t have a password yet
            </p>
            <p className="text-xs text-amber-700 mt-0.5">
              Without a password, anyone who gains access to your session can
              permanently lock you out.
            </p>
          </div>
        </div>
      )}

      {/* Section header */}
      <div className="flex items-center gap-2">
        {hasPassword ? (
          <ShieldCheck className="h-5 w-5 text-[var(--color-primary)]" />
        ) : (
          <KeyRound className="h-5 w-5 text-amber-500" />
        )}
        <h3 className="text-xl font-black text-slate-800">
          {hasPassword ? "Change password" : "Set a password"}
        </h3>
      </div>

      {hasPassword ? (
        /* ── Branch A: Change password (user already has one) ── */
        <div className="space-y-3">
          <PasswordInput
            id="current-password"
            label="Current password"
            value={pwForm.currentPassword}
            onChange={(v) => updatePwField("currentPassword", v)}
            placeholder="Enter your current password"
            error={pwErrors.currentPassword}
          />
          <PasswordInput
            id="new-password-a"
            label="New password"
            value={pwForm.newPassword}
            onChange={(v) => updatePwField("newPassword", v)}
            placeholder="Min. 8 characters"
            error={pwErrors.newPassword}
          />
          <PasswordInput
            id="confirm-password-a"
            label="Confirm new password"
            value={pwForm.confirmPassword}
            onChange={(v) => updatePwField("confirmPassword", v)}
            placeholder="Re-enter new password"
            error={pwErrors.confirmPassword}
          />
          <button
            id="update-password-btn"
            onClick={handleUpdatePassword}
            disabled={updatePasswordMutation.isPending}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--color-primary)] bg-white px-4 py-2.5 text-sm font-bold text-[var(--color-primary)] shadow-sm transition hover:bg-[var(--color-primary)] hover:text-white disabled:opacity-70 cursor-pointer"
          >
            {updatePasswordMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <KeyRound className="h-4 w-4" />
            )}
            {updatePasswordMutation.isPending
              ? "Updating..."
              : "Update password"}
          </button>
        </div>
      ) : (
        /* ── Branch B: Set first password (Google users — OTP required) ── */
        <div className="space-y-3">
          <p className="text-xs text-slate-500">
            We&apos;ll send a one-time code to{" "}
            <span className="font-semibold text-slate-700">{email} </span> to
            verify it&apos;s you before setting a password.
          </p>

          {/* OTP trigger / countdown */}
          <div className="flex items-center gap-3">
            <button
              id="send-otp-btn"
              onClick={handleSendOtp}
              disabled={sendOtpMutation.isPending || otpCooldown > 0}
              className="flex shrink-0 items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 shadow-sm transition hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] disabled:opacity-60 cursor-pointer"
            >
              {sendOtpMutation.isPending && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
              {otpCooldown > 0
                ? `Resend in ${otpCooldown}s`
                : otpSent
                  ? "Resend OTP"
                  : "Send OTP to email"}
            </button>
            {otpSent && (
              <p className="text-xs text-emerald-600 font-medium">
                Code sent ✓
              </p>
            )}
          </div>

          {/* OTP input — revealed after first send */}
          {otpSent && (
            <div className="flex flex-col gap-1">
              <label
                htmlFor="otp-input"
                className="text-sm font-bold text-slate-700"
              >
                One-time code
              </label>
              <input
                id="otp-input"
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={otp}
                onChange={(e) => {
                  setOtp(e.target.value.replace(/\D/g, ""));
                  setPwErrors((er) => ({ ...er, otp: "" }));
                }}
                placeholder="6-digit code"
                className={cn(
                  "w-40 rounded-xl border bg-white px-3 py-2 text-center text-sm font-bold tracking-widest text-slate-800 outline-none focus:ring-2",
                  pwErrors.otp
                    ? "border-red-500 focus:border-red-500 focus:ring-red-500/20"
                    : "border-slate-200 focus:border-[var(--color-primary)] focus:ring-[var(--color-primary)]/20",
                )}
              />
              {pwErrors.otp && (
                <p className="text-xs text-red-500">{pwErrors.otp}</p>
              )}
            </div>
          )}

          <PasswordInput
            id="new-password-b"
            label="New password"
            value={pwForm.newPassword}
            onChange={(v) => updatePwField("newPassword", v)}
            placeholder="Min. 8 characters"
            error={pwErrors.newPassword}
          />
          <PasswordInput
            id="confirm-password-b"
            label="Confirm new password"
            value={pwForm.confirmPassword}
            onChange={(v) => updatePwField("confirmPassword", v)}
            placeholder="Re-enter new password"
            error={pwErrors.confirmPassword}
          />

          <button
            id="set-password-btn"
            onClick={handleSetFirstPassword}
            disabled={setFirstPasswordMutation.isPending || !otpSent}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-bold text-white shadow-md transition hover:bg-amber-600 disabled:opacity-60 cursor-pointer"
          >
            {setFirstPasswordMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ShieldCheck className="h-4 w-4" />
            )}
            {setFirstPasswordMutation.isPending
              ? "Setting password..."
              : "Set password"}
          </button>
        </div>
      )}
    </div>
  );
});

export default PasswordTab;
