"use client";

import React, { useEffect, useRef, useState } from "react";
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
import { AuthFormStatus } from "./auth-form-status";
import { useAuthInteraction } from "./auth-interaction-provider";
import { AUTH_ACTION, AUTH_REDIRECT_COPY } from "../types/auth-activity.constants";
import {
  AUTH_VALIDATION_MESSAGES,
  GOOGLE_SIGN_IN_MAX_WIDTH,
} from "../types/auth-validation.constants";

const SocialLoginButtons = React.memo(function SocialLoginButtons() {
  const dispatch = useDispatch<AppDispatch>();
  const router = useRouter();
  const socialLoginMutation = useSocialLoginMutation();
  const containerRef = useRef<HTMLDivElement>(null);
  const { busy, isLocked, begin, complete, fail, redirect } = useAuthInteraction();
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new ResizeObserver(([entry]) => {
      const next = Math.max(
        0,
        Math.min(GOOGLE_SIGN_IN_MAX_WIDTH, Math.floor(entry.contentRect.width)),
      );
      setWidth((current) => (current === next ? current : next));
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  const handleSuccess = (tokenResponse: CredentialResponse) => {
    if (isLocked()) return;
    if (!tokenResponse.credential) {
      fail(AUTH_ACTION.GOOGLE, AUTH_VALIDATION_MESSAGES.googleFailed);
      toast.error(AUTH_VALIDATION_MESSAGES.googleFailed);
      return;
    }
    if (!begin(AUTH_ACTION.GOOGLE)) return;
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

          redirect(AUTH_ACTION.GOOGLE, AUTH_REDIRECT_COPY.workspace);
          toast.success(response.message || "Google Sign In successful");
          router.replace(
            getReturnToFromSearch(window.location.search) ??
              getAuthenticatedHomePath(data.role),
          );
        },
        onError: (error) => {
          const message = getAuthErrorMessage(error, AUTH_VALIDATION_MESSAGES.googleFailed);
          fail(AUTH_ACTION.GOOGLE, message);
          toast.error(message);
        },
        onSettled: () => {
          complete(AUTH_ACTION.GOOGLE);
        },
      },
    );
  };

  return (
    <div className="space-y-2">
      <div
        ref={containerRef}
        aria-busy={busy}
        aria-disabled={busy || undefined}
        className="mx-auto flex min-h-12 w-full items-center justify-center"
        style={{ maxWidth: GOOGLE_SIGN_IN_MAX_WIDTH }}
      >
        <div inert={busy || undefined} className={busy ? "opacity-50" : undefined}>
          {width > 0 && (
            <GoogleLogin
              onSuccess={handleSuccess}
              onError={() => {
                if (isLocked()) return;
                fail(AUTH_ACTION.GOOGLE, AUTH_VALIDATION_MESSAGES.googleFailed);
                toast.error(AUTH_VALIDATION_MESSAGES.googleFailed);
              }}
              type="standard"
              theme="outline"
              text="continue_with"
              size="large"
              shape="pill"
              logo_alignment="center"
              width={width}
            />
          )}
        </div>
      </div>
      <AuthFormStatus action={AUTH_ACTION.GOOGLE} />
    </div>
  );
});

export default SocialLoginButtons;
