import { useMutation } from "@tanstack/react-query";
import {
  loginApi,
  logoutApi,
  refreshApi,
  registerApi,
  socialLoginApi,
} from "../api/auth.api";
import { AuthMutationKey } from "../types/auth.constants";

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
