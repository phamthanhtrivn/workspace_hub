"use client";

import { useState } from "react";
import {
  Calendar,
  Eye,
  EyeOff,
  Lock,
  Mail,
  User,
  UserPlus,
} from "lucide-react";
import { registerApi } from "../api/auth.api";
import { toast } from "react-toastify";
import InputField from "@/components/common/input-field";
import { useRouter } from "next/navigation";

export default function RegisterForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [formData, setFormData] = useState({
    fullName: "",
    dob: "",
    email: "",
    password: "",
    confirmPassword: "",
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

    if (formData.password !== formData.confirmPassword) {
      setErrors({
        confirmPassword: "Xác nhận mật khẩu không khớp",
      });
      return;
    }

    try {
      setLoading(true);
      setErrors({});

      const response = await registerApi({
        fullName: formData.fullName,
        dob: formData.dob,
        email: formData.email,
        password: formData.password,
      });

      toast.success(response.message);
      router.replace("/login");

      setFormData({
        fullName: "",
        dob: "",
        email: "",
        password: "",
        confirmPassword: "",
      });
    } catch (error: any) {
      const response = error?.response?.data;
      console.log(response);

      if (response?.errors && Object.keys(response.errors).length > 0) {
        setErrors(response.errors);
        return;
      }

      toast.error(response?.message ?? "Đăng ký thất bại");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* FULL NAME + DOB */}
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-700">
            Họ và tên <span className="text-red-500">*</span>
          </label>

          <InputField
            id="fullName"
            type="text"
            icon={User}
            placeholder="Nguyễn Văn A"
            value={formData.fullName}
            error={errors.fullName}
            onChange={handleChange}
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-700">
            Ngày sinh <span className="text-red-500">*</span>
          </label>

          <InputField
            id="dob"
            type="date"
            icon={Calendar}
            placeholder=""
            value={formData.dob}
            error={errors.dob}
            onChange={handleChange}
          />
        </div>
      </div>

      {/* EMAIL */}
      <div className="space-y-2">
        <label className="text-sm font-semibold text-slate-700">
          Email <span className="text-red-500">*</span>
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
        <label className="text-sm font-semibold text-slate-700">
          Mật khẩu <span className="text-red-500">*</span>
        </label>

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

      {/* CONFIRM PASSWORD */}
      <div className="space-y-2">
        <label className="text-sm font-semibold text-slate-700">
          Xác nhận mật khẩu <span className="text-red-500">*</span>
        </label>

        <InputField
          id="confirmPassword"
          type={showConfirmPassword ? "text" : "password"}
          icon={Lock}
          placeholder="Nhập lại mật khẩu"
          value={formData.confirmPassword}
          error={errors.confirmPassword}
          onChange={handleChange}
          rightIcon={
            showConfirmPassword ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )
          }
          onRightClick={() => setShowConfirmPassword((prev) => !prev)}
        />
      </div>

      {/* SUBMIT */}
      <button
        type="submit"
        disabled={loading}
        className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[var(--color-primary-dark)] px-5 text-sm font-bold text-white shadow-[0_16px_32px_rgba(15,40,84,0.22)] transition hover:-translate-y-0.5 hover:bg-[var(--color-primary)] disabled:opacity-70"
      >
        <UserPlus className="h-4 w-4" />
        {loading ? "Đang đăng kí..." : "Đăng kí"}
      </button>
    </form>
  );
}
