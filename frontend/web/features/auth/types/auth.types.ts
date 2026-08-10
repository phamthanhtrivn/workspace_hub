import { USER_ROLES } from "./auth.constants";

export interface RegisterRequest {
  fullName: string;
  dob: string;
  email: string;
  password: string;
}

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
