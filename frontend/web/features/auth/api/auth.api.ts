import { store } from "@/store/store";
import { EMAIL_VERIFICATION } from '../types/email-verification.constants';
import { api } from "@/lib/axios";
import { withSessionLock } from "./session-lock";
import {
  ApiResponse,
  ForgotPasswordRequest,
  ForgotPasswordResponse,
  LoginRequest,
  LoginResponse,
  LogoutResponse,
  RefreshResponse,
  RegisterRequest,
  RegisterResponse,
  ResetPasswordRequest,
  ResetPasswordResponse,
  SocialLoginRequest,
  VerifyResetOtpRequest,
  VerifyResetOtpResponse,
} from "../types/auth.types";

export const registerApi = async (
  payload: RegisterRequest,
): Promise<ApiResponse<RegisterResponse>> => {
  const response = await api.post("/api/auth/register", payload);
  return response.data;
};

export const loginApi = async (
  payload: LoginRequest,
): Promise<ApiResponse<LoginResponse>> => {
  return withSessionLock(async () => {
    const response = await api.post("/api/auth/login", payload);
    return response.data;
  });
};

export const socialLoginApi = async (
  payload: SocialLoginRequest,
): Promise<ApiResponse<LoginResponse>> => {
  return withSessionLock(async () => {
    const response = await api.post("/api/auth/social", payload);
    return response.data;
  });
};

let pendingRefresh: Promise<ApiResponse<RefreshResponse>> | null = null;

export const refreshApi = (): Promise<ApiResponse<RefreshResponse>> => {
  if (!pendingRefresh) {
    pendingRefresh = withSessionLock(async () => {
      const response = await api.post("/api/auth/refresh");
      return response.data as ApiResponse<RefreshResponse>;
    }).finally(() => { pendingRefresh = null; });
  }
  return pendingRefresh;
};

export const logoutApi = async (): Promise<ApiResponse<LogoutResponse>> => {
  return withSessionLock(async () => {
    const token = store.getState().auth.accessToken;
    const response = await api.post("/api/auth/logout", undefined, { headers: token ? { Authorization: `Bearer ${token}` } : undefined });
    return response.data;
  });
};

export const sendResetOtpApi = async (
  payload: ForgotPasswordRequest,
): Promise<ApiResponse<ForgotPasswordResponse>> => {
  const response = await api.post("/api/auth/forgot-password", payload);
  return response.data;
};

export const verifyResetOtpApi = async (
  payload: VerifyResetOtpRequest,
): Promise<ApiResponse<VerifyResetOtpResponse>> => {
  const response = await api.post("/api/auth/verify-reset-otp", payload);
  return response.data;
};

export const resetPasswordApi = async (
  payload: ResetPasswordRequest,
): Promise<ApiResponse<ResetPasswordResponse>> => {
  const response = await api.post("/api/auth/reset-password", payload);
  return response.data;
};

export const sendEmailVerificationApi = async (email: string): Promise<ApiResponse<null>> => {
  const response = await api.post(EMAIL_VERIFICATION.send, { email }); return response.data;
};
export const confirmEmailApi = async (payload: { email: string; otp: string }): Promise<ApiResponse<null>> => {
  const response = await api.post(EMAIL_VERIFICATION.confirm, payload); return response.data;
};
