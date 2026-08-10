import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface AuthState {
  accessToken: string | null;
  userId: string | null;
  email: string | null;
  role: "USER" | "ADMIN" | null;
  fullName: string | null;
  avatarUrl: string | null;
}

const initialState: AuthState = {
  accessToken: null,
  userId: null,
  email: null,
  role: null,
  fullName: null,
  avatarUrl: null,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setCredentials: (
      state,
      action: PayloadAction<{
        accessToken: string;
        userId: string;
        email: string;
        role: "USER" | "ADMIN";
        fullName?: string | null;
        avatarUrl?: string | null;
      }>,
    ) => {
      state.accessToken = action.payload.accessToken;
      state.userId = action.payload.userId;
      state.email = action.payload.email;
      state.role = action.payload.role;
      state.fullName = action.payload.fullName ?? null;
      state.avatarUrl = action.payload.avatarUrl ?? null;
    },
    clearCredentials: (state) => {
      state.accessToken = null;
      state.userId = null;
      state.email = null;
      state.role = null;
      state.fullName = null;
      state.avatarUrl = null;
    },
  },
});

export const { setCredentials, clearCredentials } = authSlice.actions;
export default authSlice.reducer;
