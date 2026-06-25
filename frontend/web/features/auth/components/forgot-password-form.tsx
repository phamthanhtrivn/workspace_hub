"use client";

import { useState } from "react";
import Link from "next/link";
import { Mail } from "lucide-react";
import InputField from "@/components/common/input-field";
import { toast } from "react-toastify";

export default function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError("Vui lòng nhập địa chỉ email");
      return;
    }

    // Check simple email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError("Email không hợp lệ");
      return;
    }

    setError("");
    setIsLoading(true);

    try {
      // TODO: Call API here
      // await forgotPasswordApi(email);

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));
      toast.success("Đã gửi hướng dẫn khôi phục mật khẩu vào email của bạn!");
      setEmail("");
    } catch (err: any) {
      toast.error(
        err?.response?.data?.message ||
          "Đã có lỗi xảy ra, vui lòng thử lại sau.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <label htmlFor="email" className="text-sm font-semibold text-slate-700">
          Email <span className="text-red-500">*</span>
        </label>

        <InputField
          id="email"
          type="email"
          icon={Mail}
          placeholder="Nhập email của bạn"
          value={email}
          error={error}
          onChange={(e: any) => {
            setEmail(e.target.value);
            if (error) setError("");
          }}
        />
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="inline-flex h-12 w-full items-center justify-center rounded-2xl bg-[var(--color-primary-dark)] px-5 text-sm font-bold text-white shadow-md transition hover:-translate-y-0.5 hover:bg-[var(--color-primary)] hover:shadow-lg active:translate-y-0 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--color-secondary)]/20 disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:translate-y-0 disabled:hover:shadow-md cursor-pointer"
      >
        {isLoading ? "Đang gửi..." : "Gửi liên kết khôi phục"}
      </button>

      <p className="mt-8 text-center text-sm text-slate-500">
        Đã nhớ ra mật khẩu?{" "}
        <Link
          href="/login"
          className="font-bold text-[var(--color-primary)] transition hover:text-[var(--color-primary-dark)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] underline"
        >
          Quay lại Đăng nhập
        </Link>
      </p>
    </form>
  );
}
