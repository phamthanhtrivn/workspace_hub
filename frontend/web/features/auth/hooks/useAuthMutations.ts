import { sendEmailVerificationApi, confirmEmailApi } from '../api/auth.api';
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  loginApi,
  logoutApi,
  refreshApi,
  registerApi,
  socialLoginApi,
} from "../api/auth.api";
import { AuthMutationKey } from "../types/auth.constants";
import { EMAIL_VERIFICATION, type EmailVerificationDelivery } from "../types/email-verification.constants";
import { emailVerificationDeliveryKey } from "../utils/email-verification";

export const useLoginMutation = () =>
  useMutation({
    mutationKey: [AuthMutationKey.LOGIN],
    mutationFn: loginApi,
  });

export const useRegisterMutation = () =>
  useMutation({
    mutationKey: [AuthMutationKey.REGISTER],
    mutationFn: registerApi,
  });

export const useSocialLoginMutation = () =>
  useMutation({
    mutationKey: [AuthMutationKey.SOCIAL_LOGIN],
    mutationFn: socialLoginApi,
  });

export const useLogoutMutation = () =>
  useMutation({
    mutationKey: [AuthMutationKey.LOGOUT],
    mutationFn: logoutApi,
  });

export const useRefreshMutation = () =>
  useMutation({
    mutationKey: [AuthMutationKey.REFRESH],
    mutationFn: refreshApi,
  });

export const useSendEmailVerificationMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: sendEmailVerificationApi,
    // Keep the result in memory across the Register -> Verify Email navigation.
    // Entering or reloading the verification page never sends another email.
    retry: false,
    onSuccess: (_response, email) => {
      queryClient.setQueryData<EmailVerificationDelivery>(emailVerificationDeliveryKey(email), (): EmailVerificationDelivery => ({
        status: "requested", requestedAt: Date.now(),
      }));
    },
    onError: (_error, email) => {
      queryClient.setQueryData<EmailVerificationDelivery>(emailVerificationDeliveryKey(email), (): EmailVerificationDelivery => ({
        status: "failed", message: EMAIL_VERIFICATION.sendFailedMessage,
      }));
    },
  });
};
export const useConfirmEmailMutation = () => useMutation({ mutationFn: confirmEmailApi });
