import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface AuthState {
  accessToken: string | null;
  userId: string | null;
  email: string | null;
  role: "USER" | "ADMIN" | null;
}

const initialState: AuthState = {
  accessToken: null,
  userId: null,
  email: null,
  role: null,
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
      }>,
    ) => {
      state.accessToken = action.payload.accessToken;
      state.userId = action.payload.userId;
      state.email = action.payload.email;
      state.role = action.payload.role;
    },
    clearCredentials: (state) => {
      state.accessToken = null;
      state.userId = null;
      state.email = null;
      state.role = null;
    },
  },
});

export const { setCredentials, clearCredentials } = authSlice.actions;
export default authSlice.reducer;
