import { SpaceRole } from "../chat.enums";
import { SpaceMemberListItem } from "../chat.types";

export enum SpaceSettingsTab {
  OVERVIEW = "OVERVIEW",
  MEMBERS = "MEMBERS",
  INVITATIONS = "INVITATIONS",
  PERMISSIONS = "PERMISSIONS",
  DANGER = "DANGER",
}

export enum SpaceSettingsAction {
  PROMOTE_MEMBER = "PROMOTE_MEMBER",
  DEMOTE_MEMBER = "DEMOTE_MEMBER",
  REMOVE_MEMBER = "REMOVE_MEMBER",
  CANCEL_INVITATION = "CANCEL_INVITATION",
  RESEND_INVITATION = "RESEND_INVITATION",
  LEAVE_SPACE = "LEAVE_SPACE",
  DELETE_SPACE = "DELETE_SPACE",
}

export function getSpaceMemberName(member: SpaceMemberListItem) {
  return member.profile?.fullName || member.profile?.email || member.userId;
}

export function isSpaceAdmin(member?: SpaceMemberListItem | null) {
  return member?.role === SpaceRole.ADMIN;
}

export function isLastSpaceAdmin(
  currentUserId: string | null,
  members: SpaceMemberListItem[],
) {
  const admins = members.filter(isSpaceAdmin);
  return (
    admins.length === 1 &&
    Boolean(currentUserId) &&
    admins[0]?.userId === currentUserId
  );
}

export function getErrorMessage(error: unknown, fallback: string) {
  if (
    typeof error === "object" &&
    error !== null &&
    "response" in error &&
    typeof error.response === "object" &&
    error.response !== null &&
    "data" in error.response &&
    typeof error.response.data === "object" &&
    error.response.data !== null &&
    "message" in error.response.data &&
    typeof error.response.data.message === "string"
  ) {
    return error.response.data.message;
  }
  return fallback;
}
