import { AuthProvider, USER_ROLES } from "./auth.constants";

export type ApiValidationErrors = Record<string, string>;

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
  errors?: ApiValidationErrors;
}

export interface AuthErrorResponse {
  message?: string;
  errors?: ApiValidationErrors;
}

export interface RegisterRequest {
  fullName: string;
  dob: string;
  email: string;
  password: string;
}

export type RegisterResponse = Record<string, unknown>;

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  userId: string;
  email: string;
  role: USER_ROLES;
  fullName: string;
  avatarUrl: string;
  accessToken: string;
}

export type RefreshResponse = LoginResponse;

export type LogoutResponse = Record<string, unknown>;

export interface SocialLoginRequest {
  provider: AuthProvider;
  credential: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export type ForgotPasswordResponse = Record<string, unknown>;

export interface VerifyResetOtpRequest {
  email: string;
  otp: string;
}

export interface VerifyResetOtpResponse {
  resetToken: string;
}

export interface ResetPasswordRequest {
  email: string;
  resetToken: string;
  newPassword: string;
}

export type ResetPasswordResponse = Record<string, unknown>;
