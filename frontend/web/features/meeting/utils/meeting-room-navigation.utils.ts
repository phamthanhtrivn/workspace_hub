import { buildChatConversationUrl } from "@/features/chat/utils/chat-route.utils";
import { MEETING_ROUTES } from "../types/meeting.constants";

interface MeetingExitPathParams {
  currentPathname: string;
  search: string;
}

interface MeetingChatReturnUrlParams {
  channelId?: string | null;
  conversationId?: string | null;
  spaceId?: string | null;
}

const RETURN_URL_ORIGIN = "https://workspace.local";

function resolveSafeReturnUrl(returnUrl: string, currentPathname: string) {
  if (!returnUrl.startsWith("/") || returnUrl.startsWith("//")) return false;

  try {
    const url = new URL(returnUrl, RETURN_URL_ORIGIN);
    if (url.origin !== RETURN_URL_ORIGIN) return false;
    if (url.pathname === currentPathname) return false;

    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return false;
  }
}

export function buildMeetingChatReturnUrl(params: MeetingChatReturnUrlParams) {
  return buildChatConversationUrl(params) ?? MEETING_ROUTES.DASHBOARD;
}

export function resolveMeetingExitPath({
  currentPathname,
  search,
}: MeetingExitPathParams) {
  const returnUrl = new URLSearchParams(search).get("returnUrl")?.trim();
  const safeReturnUrl = returnUrl
    ? resolveSafeReturnUrl(returnUrl, currentPathname)
    : null;

  if (safeReturnUrl) {
    return safeReturnUrl;
  }

  return MEETING_ROUTES.DASHBOARD;
}

export function getCurrentMeetingExitPath() {
  if (typeof window === "undefined") {
    return MEETING_ROUTES.DASHBOARD;
  }

  return resolveMeetingExitPath({
    currentPathname: window.location.pathname,
    search: window.location.search,
  });
}
