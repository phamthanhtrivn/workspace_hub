import { useMutation } from "@tanstack/react-query";
import {
  resetPasswordApi,
  sendResetOtpApi,
  verifyResetOtpApi,
} from "../api/auth.api";
import { AuthMutationKey } from "../types/auth.constants";

export const useSendResetOtpMutation = () =>
  useMutation({
    mutationKey: [AuthMutationKey.SEND_RESET_OTP],
    mutationFn: sendResetOtpApi,
  });

export const useVerifyResetOtpMutation = () =>
  useMutation({
    mutationKey: [AuthMutationKey.VERIFY_RESET_OTP],
    mutationFn: verifyResetOtpApi,
  });

export const useResetPasswordMutation = () =>
  useMutation({
    mutationKey: [AuthMutationKey.RESET_PASSWORD],
    mutationFn: resetPasswordApi,
  });
