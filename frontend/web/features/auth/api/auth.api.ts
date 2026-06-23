import { api } from "@/lib/axios";
import { RegisterRequest } from "../types/auth.types";

export const registerApi = async (payload: RegisterRequest) => {
  const response = await api.post("/api/auth/register", payload);
  return response.data;
};
