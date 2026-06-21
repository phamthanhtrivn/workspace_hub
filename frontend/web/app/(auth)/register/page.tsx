import Link from "next/link";
import { Calendar, Lock, Mail, User, UserPlus, ArrowLeft } from "lucide-react";
import Image from "next/image";

export default function RegisterPage() {
  return (
    <div>
      <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-[var(--color-primary)] transition mb-6">
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

      <form className="space-y-5">
        <div className="grid gap-5 sm:grid-cols-2">
          {/* Full Name */}
          <div className="space-y-2">
            <label
              htmlFor="fullName"
              className="text-sm font-semibold text-slate-700"
            >
              Họ và tên
            </label>

            <div className="relative">
              <User className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

              <input
                id="fullName"
                type="text"
                placeholder="Nguyễn Văn A"
                className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50/80 pl-11 pr-4 text-sm transition placeholder:text-slate-400 hover:border-slate-300 focus:border-[var(--color-primary)] focus:bg-white focus:outline-none focus:ring-4 focus:ring-[var(--color-secondary)]/15"
              />
            </div>
          </div>

          {/* Birth Date */}
          <div className="space-y-2">
            <label
              htmlFor="birthDate"
              className="text-sm font-semibold text-slate-700"
            >
              Ngày sinh
            </label>

            <div className="relative">
              <Calendar className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

              <input
                id="birthDate"
                type="date"
                className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50/80 pl-11 pr-4 text-sm transition hover:border-slate-300 focus:border-[var(--color-primary)] focus:bg-white focus:outline-none focus:ring-4 focus:ring-[var(--color-secondary)]/15"
              />
            </div>
          </div>
        </div>

        {/* Email */}
        <div className="space-y-2">
          <label
            htmlFor="email"
            className="text-sm font-semibold text-slate-700"
          >
            Email
          </label>

          <div className="relative">
            <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

            <input
              id="email"
              type="email"
              placeholder="you@workspacehub.vn"
              className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50/80 pl-11 pr-4 text-sm transition placeholder:text-slate-400 hover:border-slate-300 focus:border-[var(--color-primary)] focus:bg-white focus:outline-none focus:ring-4 focus:ring-[var(--color-secondary)]/15"
            />
          </div>
        </div>

        {/* Password */}
        <div className="space-y-2">
          <label
            htmlFor="password"
            className="text-sm font-semibold text-slate-700"
          >
            Mật khẩu
          </label>

          <div className="relative">
            <Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

            <input
              id="password"
              type="password"
              placeholder="Nhập mật khẩu"
              className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50/80 pl-11 pr-4 text-sm transition placeholder:text-slate-400 hover:border-slate-300 focus:border-[var(--color-primary)] focus:bg-white focus:outline-none focus:ring-4 focus:ring-[var(--color-secondary)]/15"
            />
          </div>
        </div>

        {/* Confirm Password */}
        <div className="space-y-2">
          <label
            htmlFor="confirmPassword"
            className="text-sm font-semibold text-slate-700"
          >
            Xác nhận mật khẩu
          </label>

          <div className="relative">
            <Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

            <input
              id="confirmPassword"
              type="password"
              placeholder="Nhập lại mật khẩu"
              className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50/80 pl-11 pr-4 text-sm transition placeholder:text-slate-400 hover:border-slate-300 focus:border-[var(--color-primary)] focus:bg-white focus:outline-none focus:ring-4 focus:ring-[var(--color-secondary)]/15"
            />
          </div>
        </div>

        <button
          type="submit"
          className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[var(--color-primary-dark)] px-5 text-sm font-bold text-white shadow-[0_16px_32px_rgba(15,40,84,0.22)] transition hover:-translate-y-0.5 hover:bg-[var(--color-primary)] active:translate-y-0 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--color-secondary)]/25 cursor-pointer"
        >
          <UserPlus className="h-4 w-4" />
          Đăng kí
        </button>
      </form>

      <div className="my-7 flex items-center gap-3 text-xs font-semibold text-slate-400">
        <div className="h-px flex-1 bg-slate-200" />
        hoặc tiếp tục với
        <div className="h-px flex-1 bg-slate-200" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <button
          type="button"
          className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:bg-slate-50 active:translate-y-0 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--color-secondary)]/20 cursor-pointer"
        >
          <Image
            src="https://thesvg.org/icons/google/default.svg"
            alt="Google"
            width={20}
            height={20}
          />
          Google
        </button>
        <button
          type="button"
          className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:bg-slate-50 active:translate-y-0 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--color-secondary)]/20 cursor-pointer"
        >
          <Image
            src="https://thesvg.org/icons/linkedin/default.svg"
            alt="Google"
            width={20}
            height={20}
          />
          LinkedIn
        </button>
      </div>

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
