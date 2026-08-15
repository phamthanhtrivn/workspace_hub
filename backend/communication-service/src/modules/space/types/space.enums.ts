export enum DEFAULT_SPACE_CHANNEL_NAMES {
  GENERAL = 'general',
  ANNOUNCEMENT = 'announcement',
  JUST_FOR_FUN = 'just-for-fun',
}

export enum SPACE_SUCCESS_MESSAGES_LABEL {
  CREATED = 'Space created successfully',
  LISTED = 'Spaces retrieved successfully',
  UPDATED = 'Space updated successfully',
  SETTINGS_UPDATED = 'Space settings updated successfully',
  DETAILS_RETRIEVED = 'Space details retrieved successfully',
  MEMBERS_LISTED = 'Space members retrieved successfully',
  MEMBER_ROLE_UPDATED = 'Space member role updated successfully',
  MEMBER_REMOVED = 'Space member removed successfully',
  LEFT = 'Left space successfully',
  DELETED = 'Space deleted successfully',
  CHANNEL_CREATED = 'Channel created successfully',
  CHANNEL_LISTED = 'Channels retrieved successfully',
  INVITED = 'Space invitations sent successfully',
  INVITATIONS_LISTED = 'Space invitations retrieved successfully',
  INVITATION_CANCELLED = 'Space invitation cancelled successfully',
  INVITATION_RESENT = 'Space invitation resent successfully',
}

export enum SPACE_ERROR_MESSAGES {
  MISSING_USER_ID = 'Missing userId',
  MISSING_SPACE_ID = 'Missing spaceId',
  MISSING_REQUIRED_INFO = 'Missing required information',
  INVALID_SPACE_MEMBER_ROLE = 'Invalid space member role',
  SPACE_NOT_FOUND = 'Space not found',
  SPACE_NAME_EMPTY = 'Space name cannot be empty',
  CHANNEL_CREATE_DISABLED = 'Members are not allowed to create channels in this space',
  SETTINGS_UNAVAILABLE = 'Space settings table is not available. Run Prisma generate and db push for communication-service.',
  NOT_MEMBER = 'You are not a member of this space',
  ADMIN_REQUIRED = 'Only space admins can perform this action',
  MEMBER_NOT_FOUND = 'Member does not exist in this space',
  SELF_ROLE_CHANGE = 'You cannot change your own role',
  SELF_REMOVE = 'You cannot remove yourself from the space',
  LAST_ADMIN = 'Space must have at least one admin',
  INVITATION_NOT_FOUND = 'Invitation not found',
  CHANNEL_NAME_EXISTS = 'A channel with this name already exists in this space',
}

export const SPACE_MEMBER_SEARCH_DEFAULT_LIMIT = 500;
export const SPACE_MEMBER_SEARCH_MAX_LIMIT = 500;
