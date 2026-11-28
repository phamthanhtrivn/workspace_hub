import axios from "axios";
import { api } from "@/lib/axios";
import { store } from "@/store/store";
import { clearCredentials, setCredentials } from "@/store/auth/auth-slice";
import { refreshApi } from "./auth.api";
import { withSessionLock } from "./session-lock";
import {
  createSessionRecovery,
  type SessionSnapshot,
} from "./session-recovery-core";
import { getLoginRedirectPath } from "../utils/auth-redirect";
import {
  AUTH_API_ROUTES,
  SESSION_REQUEST_TIMEOUT_MS,
} from "../types/auth.constants";

const PUBLIC_PATHS = [
  "/login",
  "/register",
  "/forgot-password",
  "/verify-email",
  "/",
  "/documents/shared",
];

let sessionEpoch = 0;
let sessionOwner = store.getState().auth.userId;
store.subscribe(() => {
  const owner = store.getState().auth.userId;
  if (owner !== sessionOwner) {
    sessionEpoch++;
    sessionOwner = owner;
  }
});
export const getSessionEpoch = () => sessionEpoch;

export function redirectToLoginIfNeeded() {
  if (typeof window === "undefined") return;
  const { pathname, search } = window.location;
  if (
    PUBLIC_PATHS.some(
      (path) => pathname === path || pathname.startsWith(path + "/"),
    )
  )
    return;
  window.location.assign(getLoginRedirectPath(pathname, search));
}

export function isAuthenticationFailure(error: unknown): boolean {
  return (
    axios.isAxiosError(error) &&
    (error.response?.status === 401 || error.response?.status === 403)
  );
}

export async function endSession(
  snapshot: SessionSnapshot = store.getState().auth,
): Promise<void> {
  // Serialize cookie deletion with login/refresh; recheck after obtaining the lock.
  await withSessionLock(async () => {
    if (store.getState().auth !== snapshot) return;
    store.dispatch(clearCredentials());
    const cleared = store.getState().auth;
    try {
      await axios.post(
        `${api.defaults.baseURL}${AUTH_API_ROUTES.LOGOUT}`,
        {},
        { withCredentials: true, timeout: SESSION_REQUEST_TIMEOUT_MS },
      );
    } catch {
      /* Local credentials are already cleared. */
    }
    if (store.getState().auth === cleared) redirectToLoginIfNeeded();
  });
}

export const sessionRecovery = createSessionRecovery({
  getSession: () => store.getState().auth,
  refresh: async () => {
    const response = await refreshApi();
    if (
      typeof response.data?.accessToken !== "string" ||
      !response.data.accessToken ||
      typeof response.data.userId !== "string"
    ) {
      throw new Error("Invalid session refresh response");
    }
    return response.data;
  },
  commit: (credentials) => {
    store.dispatch(setCredentials(credentials));
  },
  isAuthenticationFailure,
  terminate: endSession,
});
