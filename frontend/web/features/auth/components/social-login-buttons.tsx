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
import { Spinner } from "@/components/ui/spinner";
import {
  AUTH_VALIDATION_MESSAGES,
  GOOGLE_SIGN_IN_MAX_WIDTH,
} from "../types/auth-validation.constants";

const SocialLoginButtons = React.memo(function SocialLoginButtons() {
  const dispatch = useDispatch<AppDispatch>();
  const router = useRouter();
  const socialLoginMutation = useSocialLoginMutation();
  const containerRef = useRef<HTMLDivElement>(null);
  const requestLock = useRef(false);
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
    if (requestLock.current || socialLoginMutation.isPending) return;
    if (!tokenResponse.credential) {
      toast.error(AUTH_VALIDATION_MESSAGES.googleFailed);
      return;
    }
    requestLock.current = true;
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

          toast.success(response.message || "Google Sign In successful");
          router.replace(
            getReturnToFromSearch(window.location.search) ??
              getAuthenticatedHomePath(data.role),
          );
        },
        onError: (error) => {
          toast.error(
            getAuthErrorMessage(error, AUTH_VALIDATION_MESSAGES.googleFailed),
          );
        },
        onSettled: () => {
          requestLock.current = false;
        },
      },
    );
  };

  return (
    <div className="space-y-2">
      <div
        ref={containerRef}
        aria-busy={socialLoginMutation.isPending}
        className="mx-auto flex min-h-12 w-full items-center justify-center"
        style={{ maxWidth: GOOGLE_SIGN_IN_MAX_WIDTH }}
      >
        <div inert={socialLoginMutation.isPending || undefined}>
          {width > 0 && (
            <GoogleLogin
              onSuccess={handleSuccess}
              onError={() => toast.error(AUTH_VALIDATION_MESSAGES.googleFailed)}
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
      {socialLoginMutation.isPending && (
        <p
          role="status"
          className="flex items-center justify-center gap-2 text-sm text-muted-foreground"
        >
          <Spinner className="size-4" /> Signing in with Google...
        </p>
      )}
    </div>
  );
});

export default SocialLoginButtons;
