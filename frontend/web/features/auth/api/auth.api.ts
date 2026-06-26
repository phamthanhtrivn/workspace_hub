import { api } from "@/lib/axios";
import { LoginRequest, RegisterRequest } from "../types/auth.types";

export const registerApi = async (payload: RegisterRequest) => {
  const response = await api.post("/api/auth/register", payload);
  return response.data;
};

export const loginApi = async (payload: LoginRequest) => {
  const response = await api.post("/api/auth/login", payload);
  return response.data;
};

export const socialLoginApi = async (provider: string, credential: string) => {
  const response = await api.post("/api/auth/social", { provider, credential });
  return response.data;
};

export const refreshApi = async () => {
  const response = await api.post("/api/auth/refresh");
  return response.data;
};

export const logoutApi = async () => {
  const response = await api.post("/api/auth/logout");
  return response.data;
};

