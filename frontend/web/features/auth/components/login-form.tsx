"use client";

import { useState } from "react";
import { Eye, EyeOff, Lock, LogIn, Mail } from "lucide-react";
import { loginApi } from "../api/auth.api";
import { toast } from "react-toastify";
import InputField from "@/components/common/input-field";
import { useRouter } from "next/navigation";
import { useDispatch } from "react-redux";
import { setCredentials } from "@/store/auth-slice";
import type { AppDispatch } from "@/store/store";

export default function LoginForm() {
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [id]: value,
    }));

    setErrors((prev) => ({
      ...prev,
      [id]: "",
    }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    try {
      setLoading(true);
      setErrors({});

      const response = await loginApi({
        email: formData.email,
        password: formData.password,
      });

      const data = response.data;

      dispatch(
        setCredentials({
          accessToken: data.accessToken,
          userId: data.userId,
          email: data.email,
          role: data.role,
        }),
      );

      toast.success(response.message);

      if (data.role === "ADMIN") {
        router.replace("/");
      } else {
        router.replace("/dashboard");
      }
    } catch (error: any) {
      const response = error?.response?.data;

      console.log(response);

      if (response?.errors && Object.keys(response.errors).length > 0) {
        setErrors(response.errors);
        return;
      }

      toast.error(response?.message ?? "Đăng nhập thất bại");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* EMAIL */}
      <div className="space-y-2">
        <label htmlFor="email" className="text-sm font-semibold text-slate-700">
          Email
        </label>

        <InputField
          id="email"
          type="email"
          icon={Mail}
          placeholder="you@workspacehub.vn"
          value={formData.email}
          error={errors.email}
          onChange={handleChange}
        />
      </div>

      {/* PASSWORD */}
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-4">
          <label
            htmlFor="password"
            className="text-sm font-semibold text-slate-700"
          >
            Mật khẩu
          </label>
        </div>

        <InputField
          id="password"
          type={showPassword ? "text" : "password"}
          icon={Lock}
          placeholder="Nhập mật khẩu"
          value={formData.password}
          error={errors.password}
          onChange={handleChange}
          rightIcon={
            showPassword ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )
          }
          onRightClick={() => setShowPassword((prev) => !prev)}
        />
      </div>

      {/* SUBMIT */}
      <button
        type="submit"
        disabled={loading}
        className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[var(--color-primary-dark)] px-5 text-sm font-bold text-white shadow-[0_16px_32px_rgba(15,40,84,0.22)] transition hover:-translate-y-0.5 hover:bg-[var(--color-primary)] active:translate-y-0 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--color-secondary)]/25 cursor-pointer disabled:opacity-70"
      >
        <LogIn className="h-4 w-4" />
        {loading ? "Đang đăng nhập..." : "Đăng nhập"}
      </button>
    </form>
  );
}
