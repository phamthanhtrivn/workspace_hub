"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { GoogleLogin, type CredentialResponse } from "@react-oauth/google";
import { useDispatch } from "react-redux";
import { toast } from "sonner";
import { setCredentials } from "@/store/auth/auth-slice";
import type { AppDispatch } from "@/store/store";
import { useSocialLoginMutation } from "../hooks/useAuthMutations";
import { AuthProvider } from "../types/auth.constants";
import { getAuthErrorMessage } from "../utils/auth-error";
import {
  getAuthenticatedHomePath,
  getReturnToFromSearch,
} from "../utils/auth-redirect";


const SocialLoginButtons = React.memo(function SocialLoginButtons() {
  const dispatch = useDispatch<AppDispatch>();
  const router = useRouter();
  const socialLoginMutation = useSocialLoginMutation();

  const handleSuccess = (tokenResponse: CredentialResponse) => {
      if (!tokenResponse.credential || socialLoginMutation.isPending) return;
      socialLoginMutation.mutate(
        {
          provider: AuthProvider.GOOGLE,
          credential: tokenResponse.credential,
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
              response.message || "Google Sign In successful",
            );
            router.replace(
              getReturnToFromSearch(window.location.search) ??
                getAuthenticatedHomePath(data.role),
            );
          },
          onError: (error) => {
            toast.error(
              getAuthErrorMessage(
                error,
                "Google Sign In failed",
              ),
            );
          },
        },
      );
  };

  return (
    <div className="flex justify-between items-center gap-2 ">
      <GoogleLogin
        onSuccess={handleSuccess}
        onError={() => toast.error("Google Sign In failed")}
        text="continue_with"
        size="large"
        shape="pill"
      />
    </div>
  );
});

export default SocialLoginButtons;
