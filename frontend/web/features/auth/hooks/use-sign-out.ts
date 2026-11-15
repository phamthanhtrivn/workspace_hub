"use client";

import { useRef } from "react";
import { useRouter } from "next/navigation";
import { useIsMutating, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAppDispatch, useAppSelector } from "@/store/store";
import { clearCredentials } from "@/store/auth/auth-slice";
import { clearLocalPomodoroData } from "@/features/pomodoro/utils/pomodoro-local-storage";
import { socketService } from "@/features/chat/api/chat-socket.service";
import { notificationSocketService } from "@/features/notification/api/notification-socket.service";
import {
  AuthMutationKey,
  AuthRouteTarget,
  SIGN_OUT_COPY,
} from "../types/auth.constants";
import { getAuthErrorMessage } from "../utils/auth-error";
import { useLogoutMutation } from "./useAuthMutations";

/** Shared by the user menu and Settings; local cleanup also runs on API failure. */
export function useSignOut() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();
  const userId = useAppSelector((state) => state.auth.userId);
  const logout = useLogoutMutation();
  const signingOut =
    useIsMutating({ mutationKey: [AuthMutationKey.LOGOUT] }) > 0;
  const submitted = useRef(false);

  const signOut = () => {
    if (submitted.current || signingOut) return;
    submitted.current = true;
    logout.mutate(undefined, {
      onSuccess: () => toast.success(SIGN_OUT_COPY.success),
      onError: (error) =>
        toast.error(getAuthErrorMessage(error, SIGN_OUT_COPY.failed)),
      onSettled: () => {
        if (userId) clearLocalPomodoroData(userId);
        notificationSocketService.disconnect();
        socketService.disconnect();
        dispatch(clearCredentials());
        queryClient.clear();
        submitted.current = false;
        router.push(AuthRouteTarget.LOGIN);
      },
    });
  };

  return { signOut, isSigningOut: signingOut || logout.isPending };
}
