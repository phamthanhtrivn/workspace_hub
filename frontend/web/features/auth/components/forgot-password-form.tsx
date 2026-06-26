"use client";

import { useState } from "react";
import Link from "next/link";
import { Mail, Lock, Eye, EyeOff, ArrowLeft, KeyRound } from "lucide-react";
import InputField from "@/components/common/input-field";
import { OtpInput } from "@/components/common/OtpInput";
import { toast } from "react-toastify";
import { api } from "@/lib/axios";

type Step = "EMAIL" | "OTP" | "PASSWORD";

export default function ForgotPasswordForm() {
  const [step, setStep] = useState<Step>("EMAIL");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [resetToken, setResetToken] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleApiError = (err: any) => {
    const data = err?.response?.data;
    if (data?.errors) {
      setErrors(data.errors);
    } else {
      toast.error(data?.message || "Đã có lỗi xảy ra, vui lòng thử lại sau.");
    }
  };

  const handleSendEmail = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setErrors({});
    setIsLoading(true);

    try {
      await api.post("/api/auth/forgot-password", { email });

      toast.success("Mã xác nhận đã được gửi vào email của bạn!");
      setStep("OTP");
    } catch (err: any) {
      handleApiError(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setIsLoading(true);

    try {
      const response = await api.post("/api/auth/verify-reset-otp", {
        email,
        otp,
      });
      const token = response.data.data.resetToken;
      setResetToken(token);

      toast.success("Xác thực thành công!");
      setStep("PASSWORD");
    } catch (err: any) {
      handleApiError(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    if (newPassword !== confirmPassword) {
      setErrors({ confirmPassword: "Mật khẩu xác nhận không khớp" });
      return;
    }

    setIsLoading(true);

    try {
      await api.post("/api/auth/reset-password", {
        email,
        resetToken,
        newPassword,
      });

      toast.success("Cập nhật mật khẩu thành công!");
      window.location.href = "/login";
    } catch (err: any) {
      handleApiError(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {step !== "EMAIL" && (
        <button
          type="button"
          onClick={() => {
            if (step === "OTP") setStep("EMAIL");
            if (step === "PASSWORD") setStep("OTP");
          }}
          className="flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-800 transition cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Quay lại
        </button>
      )}

      {step === "EMAIL" && (
        <form
          onSubmit={handleSendEmail}
          className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500"
        >
          <div className="space-y-2">
            <label
              htmlFor="email"
              className="text-sm font-semibold text-slate-700"
            >
              Email <span className="text-red-500">*</span>
            </label>
            <InputField
              id="email"
              type="email"
              icon={Mail}
              placeholder="Nhập email của bạn"
              value={email}
              error={errors.email}
              onChange={(e: any) => {
                setEmail(e.target.value);
                if (errors.email) setErrors((prev) => ({ ...prev, email: "" }));
              }}
            />
          </div>
          <button
            type="submit"
            disabled={isLoading}
            className="inline-flex h-12 w-full items-center justify-center rounded-2xl bg-[var(--color-primary-dark)] px-5 text-sm font-bold text-white shadow-md transition hover:-translate-y-0.5 hover:bg-[var(--color-primary)] hover:shadow-lg active:translate-y-0 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--color-secondary)]/20 disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:translate-y-0 disabled:hover:shadow-md cursor-pointer"
          >
            {isLoading ? "Đang gửi..." : "Gửi mã khôi phục"}
          </button>
        </form>
      )}

      {step === "OTP" && (
        <form
          onSubmit={handleVerifyOtp}
          className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500"
        >
          <div className="space-y-4">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 text-primary mb-4">
                <KeyRound className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-800">
                Nhập mã xác nhận
              </h3>
              <p className="text-sm text-slate-500 mt-1">
                Mã gồm 6 chữ số đã được gửi đến
                <br />
                <span className="font-semibold text-slate-800">{email}</span>
              </p>
            </div>

            <div className="flex flex-col items-center gap-2">
              <OtpInput
                length={6}
                value={otp}
                onChange={(val) => {
                  setOtp(val);
                  if (errors.otp) setErrors((prev) => ({ ...prev, otp: "" }));
                }}
              />
              {errors.otp && (
                <p className="text-xs text-red-500 mt-2">{errors.otp}</p>
              )}
            </div>

            <div className="text-center text-sm">
              <span className="text-slate-500">Chưa nhận được mã? </span>
              <button
                type="button"
                onClick={() => handleSendEmail()}
                className="font-bold text-[var(--color-primary)] transition hover:text-[var(--color-primary-dark)] cursor-pointer"
                disabled={isLoading}
              >
                Gửi lại
              </button>
            </div>
          </div>
          <button
            type="submit"
            disabled={isLoading || otp.length < 6}
            className="inline-flex h-12 w-full items-center justify-center rounded-2xl bg-[var(--color-primary-dark)] px-5 text-sm font-bold text-white shadow-md transition hover:-translate-y-0.5 hover:bg-[var(--color-primary)] hover:shadow-lg active:translate-y-0 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--color-secondary)]/20 disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:translate-y-0 disabled:hover:shadow-md cursor-pointer"
          >
            {isLoading ? "Đang xác thực..." : "Xác thực"}
          </button>
        </form>
      )}

      {step === "PASSWORD" && (
        <form
          onSubmit={handleResetPassword}
          className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500"
        >
          <div className="space-y-2">
            <label
              htmlFor="newPassword"
              className="text-sm font-semibold text-slate-700"
            >
              Mật khẩu mới <span className="text-red-500">*</span>
            </label>
            <InputField
              id="newPassword"
              type={showPassword ? "text" : "password"}
              icon={Lock}
              placeholder="Nhập mật khẩu mới"
              value={newPassword}
              error={errors.newPassword}
              onChange={(e: any) => {
                setNewPassword(e.target.value);
                if (errors.newPassword)
                  setErrors((prev) => ({ ...prev, newPassword: "" }));
              }}
              rightIcon={
                showPassword ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )
              }
              onRightClick={() => setShowPassword(!showPassword)}
            />
          </div>

          <div className="space-y-2">
            <label
              htmlFor="confirmPassword"
              className="text-sm font-semibold text-slate-700"
            >
              Xác nhận mật khẩu <span className="text-red-500">*</span>
            </label>
            <InputField
              id="confirmPassword"
              type={showConfirmPassword ? "text" : "password"}
              icon={Lock}
              placeholder="Nhập lại mật khẩu mới"
              value={confirmPassword}
              error={errors.confirmPassword}
              onChange={(e: any) => {
                setConfirmPassword(e.target.value);
                if (errors.confirmPassword)
                  setErrors((prev) => ({ ...prev, confirmPassword: "" }));
              }}
              rightIcon={
                showConfirmPassword ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )
              }
              onRightClick={() => setShowConfirmPassword(!showConfirmPassword)}
            />
          </div>
          <button
            type="submit"
            disabled={isLoading}
            className="inline-flex h-12 w-full items-center justify-center rounded-2xl bg-[var(--color-primary-dark)] px-5 text-sm font-bold text-white shadow-md transition hover:-translate-y-0.5 hover:bg-[var(--color-primary)] hover:shadow-lg active:translate-y-0 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--color-secondary)]/20 disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:translate-y-0 disabled:hover:shadow-md cursor-pointer"
          >
            {isLoading ? "Đang cập nhật..." : "Cập nhật mật khẩu"}
          </button>
        </form>
      )}

      {step === "EMAIL" && (
        <p className="mt-8 text-center text-sm text-slate-500">
          Đã nhớ ra mật khẩu?{" "}
          <Link
            href="/login"
            className="font-bold text-[var(--color-primary)] transition hover:text-[var(--color-primary-dark)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] underline"
          >
            Quay lại Đăng nhập
          </Link>
        </p>
      )}
    </div>
  );
}
