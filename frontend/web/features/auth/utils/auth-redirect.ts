import { AuthRouteTarget, USER_ROLES } from "../types/auth.constants";

export function isSafeInternalReturnTo(returnTo: string | null): returnTo is string {
  return Boolean(
    returnTo &&
      returnTo.startsWith("/") &&
      !returnTo.startsWith("//") &&
      !returnTo.startsWith("/login"),
  );
}

export function getLoginRedirectPath(pathname: string, search = "") {
  const returnTo = `${pathname}${search}`;

  if (!isSafeInternalReturnTo(returnTo)) {
    return "/login";
  }

  return `/login?returnTo=${encodeURIComponent(returnTo)}`;
}

export function getReturnToFromSearch(search: string) {
  const returnTo = new URLSearchParams(search).get("returnTo");
  return isSafeInternalReturnTo(returnTo) ? returnTo : null;
}

export function getAuthenticatedHomePath(role: string) {
  return role === USER_ROLES.ADMIN
    ? AuthRouteTarget.ADMIN_HOME
    : AuthRouteTarget.USER_DASHBOARD;
}
