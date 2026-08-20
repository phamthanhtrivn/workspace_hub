"use client";

import React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useGoogleLogin } from "@react-oauth/google";
import { useDispatch } from "react-redux";
import { toast } from "sonner";
import { setCredentials } from "@/store/auth/auth-slice";
import { useAppIntl } from "@/features/i18n/useAppIntl";
import type { AppDispatch } from "@/store/store";
import { useSocialLoginMutation } from "../hooks/useAuthMutations";
import {
  AuthProvider,
  AuthRouteTarget,
  USER_ROLES,
} from "../types/auth.constants";
import { getAuthErrorMessage } from "../utils/auth-error";

const SocialLoginButtons = React.memo(function SocialLoginButtons() {
  const intl = useAppIntl();
  const dispatch = useDispatch<AppDispatch>();
  const router = useRouter();
  const socialLoginMutation = useSocialLoginMutation();

  const login = useGoogleLogin({
    onSuccess: (tokenResponse) => {
      socialLoginMutation.mutate(
        {
          provider: AuthProvider.GOOGLE,
          credential: tokenResponse.access_token,
        },
        {
          onSuccess: (response) => {
            const data = response.data;

            dispatch(
              setCredentials({
                accessToken: data.accessToken,
                userId: data.userId,
                email: data.email,
                role: data.role,
                fullName: data.fullName,
                avatarUrl: data.avatarUrl,
              }),
            );

            toast.success(
              response.message ||
                intl.formatMessage({ id: "auth.googleSignInSuccess" }),
            );
            router.replace(
              data.role === USER_ROLES.ADMIN
                ? AuthRouteTarget.ADMIN_HOME
                : AuthRouteTarget.USER_DASHBOARD,
            );
          },
          onError: (error) => {
            toast.error(
              getAuthErrorMessage(
                error,
                intl.formatMessage({ id: "auth.googleSignInFailed" }),
              ),
            );
          },
        },
      );
    },
    onError: () =>
      toast.error(intl.formatMessage({ id: "auth.googleSignInFailed" })),
  });

  return (
    <div className="flex justify-between items-center gap-2 ">
      <button
        type="button"
        onClick={() => login()}
        disabled={socialLoginMutation.isPending}
        className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:bg-slate-50 active:translate-y-0 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--color-secondary)]/20 cursor-pointer disabled:opacity-70"
      >
        <Image
          src="https://thesvg.org/icons/google/default.svg"
          alt="Google"
          width={20}
          height={20}
        />
        {intl.formatMessage({ id: "auth.google" })}
      </button>
    </div>
  );
});

export default SocialLoginButtons;
