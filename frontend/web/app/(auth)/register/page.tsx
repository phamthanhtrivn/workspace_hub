import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import Image from "next/image";
import RegisterForm from "@/features/auth/components/register-form";
import SocialLoginButtons from "@/features/auth/components/social-login-buttons";

export default function RegisterPage() {
  return (
    <div>
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-[var(--color-primary)] transition mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Quay về trang chủ
      </Link>

      <div className="mb-8 text-center">
        <h2 className="mt-3 text-3xl font-black tracking-tight text-[var(--color-primary-dark)] sm:text-4xl">
          Đăng kí
        </h2>

        <p className="text-sm font-semibold text-[var(--color-secondary)]">
          Bắt đầu hành trình làm việc và học tập thông minh.
        </p>
      </div>

      <RegisterForm />

      <div className="my-7 flex items-center gap-3 text-xs font-semibold text-slate-400">
        <div className="h-px flex-1 bg-slate-200" />
        hoặc tiếp tục với
        <div className="h-px flex-1 bg-slate-200" />
      </div>

      <SocialLoginButtons />

      <p className="mt-8 text-center text-sm text-slate-500">
        Đã có tài khoản?{" "}
        <Link
          href="/login"
          className="font-bold text-[var(--color-primary)] transition hover:text-[var(--color-primary-dark)] underline"
        >
          Đăng nhập ngay
        </Link>
      </p>
    </div>
  );
}
