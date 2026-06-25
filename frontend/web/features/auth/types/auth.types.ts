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
  role: "USER" | "ADMIN";
  accessToken: string;
}
