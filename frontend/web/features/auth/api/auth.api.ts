import { api } from "@/lib/axios";
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
  const response = await api.post("/api/auth/login", payload);
  return response.data;
};

export const socialLoginApi = async (
  payload: SocialLoginRequest,
): Promise<ApiResponse<LoginResponse>> => {
  const response = await api.post("/api/auth/social", payload);
  return response.data;
};

export const refreshApi = async (): Promise<ApiResponse<RefreshResponse>> => {
  const response = await api.post("/api/auth/refresh");
  return response.data;
};

export const logoutApi = async (): Promise<ApiResponse<LogoutResponse>> => {
  const response = await api.post("/api/auth/logout");
  return response.data;
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
