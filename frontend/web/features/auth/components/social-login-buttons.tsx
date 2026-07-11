"use client";

import React from "react";
import { useGoogleLogin } from "@react-oauth/google";
import { toast } from "react-toastify";
import { socialLoginApi } from "../api/auth.api";
import { useDispatch } from "react-redux";
import { setCredentials } from "@/store/auth/auth-slice";
import { useRouter } from "next/navigation";
import Image from "next/image";

const SocialLoginButtons = React.memo(function SocialLoginButtons() {
  const dispatch = useDispatch();
  const router = useRouter();

  const login = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      try {
        const response = await socialLoginApi(
          "GOOGLE",
          tokenResponse.access_token,
        );
        const data = response.data;

        dispatch(
          setCredentials({
            accessToken: data.accessToken,
            userId: data.userId,
            email: data.email,
            role: data.role,
          }),
        );

        toast.success(response.message || "Đăng nhập Google thành công");

        if (data.role === "ADMIN") {
          router.replace("/");
        } else {
          router.replace("/dashboard");
        }
      } catch (error: any) {
        toast.error(
          error?.response?.data?.message || "Đăng nhập Google thất bại",
        );
      }
    },
    onError: () => toast.error("Đăng nhập Google thất bại"),
  });

  return (
    <div className="flex justify-between items-center gap-2 ">
      <button
        type="button"
        onClick={() => login()}
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
      {/* <button
        type="button"
        onClick={() => toast.info("Đăng nhập LinkedIn chưa được hỗ trợ")}
        className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:bg-slate-50 active:translate-y-0 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--color-secondary)]/20 cursor-pointer"
      >
        <Image
          src="https://thesvg.org/icons/linkedin/default.svg"
          alt="LinkedIn"
          width={20}
          height={20}
        />
        LinkedIn
      </button> */}
    </div>
  );
});

export default SocialLoginButtons;
