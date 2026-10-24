export enum CHANNEL_ERROR_MESSAGES {
  PRIVATE_ACCESS_DENIED = 'This channel is not available to you',
  PRIVATE_OWNER_REQUIRED = 'Only the private channel owner can perform this action',
  PRIVATE_ROLE_CHANGE_DISABLED = 'Private channel members do not have editable space roles',
  PRIVATE_JOIN_DENIED = 'Private channels require the owner to add you',
  INVALID_MEMBERS = 'Channel members must belong to this space',
  OWNER_CANNOT_BE_REMOVED = 'The channel owner cannot be removed',
  SELF_CONVERSATION = 'Cannot create a conversation with yourself',
  CHANNEL_NOT_FOUND = 'Channel not found',
  SETTINGS_ACCESS_DENIED = 'You are not allowed to change channel settings',
  TASK_SETTING_REQUIRES_PROJECT = 'Task creation settings require a project-linked space',
  TASK_CHANNEL_PROJECT_MISMATCH = 'Channel does not belong to this project',
  TASK_CREATION_DISABLED = 'Task creation is disabled in this channel',
  SELF_ROLE_CHANGE = 'You cannot change your own role',
  ROLE_CHANGE_ACCESS_DENIED = 'Only space admins can change member roles',
  MEMBER_NOT_IN_SPACE = 'Member does not exist in this space',
  NOT_MEMBER_OF_CHANNEL = 'You are not a member of this channel',
  NOT_MEMBER_OF_SPACE = 'You are not a member of this space',
  DEFAULT_CHANNEL_DELETE_PREVENTED = 'Default channels cannot be deleted',
  DEFAULT_CHANNEL_RENAME_PREVENTED = 'Default channels cannot be renamed',
  DISBAND_ACCESS_DENIED = 'You are not allowed to disband this channel',
  UPDATE_ACCESS_DENIED = 'You are not allowed to update this channel',
  KICK_ACCESS_DENIED = 'You are not allowed to remove this member',
  KICK_ADMIN_ACCESS_DENIED = 'Admins can only remove regular members',
  OWNER_KICK_DENIED = 'You cannot remove the space owner',
  SELF_KICK = 'You cannot remove yourself from the space',
  LAST_ADMIN = 'Space must have at least one admin',
  MISSING_USER_ID = 'Missing userId',
  MISSING_USER_OR_CHANNEL_ID = 'Missing userId or channelId',
  MISSING_REQUIRED_INFO = 'Missing required information',
}

export enum CHANNEL_SUCCESS_MESSAGES {
  CREATED = 'Conversation created successfully',
  LISTED = 'Conversations retrieved successfully',
  SETTINGS_UPDATED = 'Channel settings updated successfully',
  ROLE_UPDATED = 'Role updated successfully',
  LEFT = 'Left the space successfully',
  DISBANDED = 'Channel disbanded successfully',
  MUTE_ON = 'Conversation muted successfully',
  MUTE_OFF = 'Conversation unmuted successfully',
  INFO_UPDATED = 'Channel information updated successfully',
  MEMBER_REMOVED = 'Member removed from the space successfully',
  MEMBERS_LISTED = 'Channel members retrieved successfully',
}

export const CHANNEL_MEMBER_SEARCH_DEFAULT_LIMIT = 500;
export const CHANNEL_MEMBER_SEARCH_MAX_LIMIT = 500;
export const PRIVATE_CHANNEL_MEMBER_PAGE_SIZE = 10;
export const PRIVATE_CHANNEL_REMOVAL_NOTIFICATION = {
  TITLE: 'Removed from a private channel',
  CONTENT: (actorName: string, channelName: string, spaceName: string) =>
    `${actorName} removed you from ${channelName} in ${spaceName}. You no longer have access to this channel.`,
} as const;
export const PRIVATE_CHANNEL_OWNERSHIP_NOTIFICATION = {
  TITLE: 'You are now a private channel owner',
  CONTENT: (
    channelName: string,
    spaceName: string,
    previousOwnerName: string,
  ) =>
    `You are now the owner of ${channelName} in ${spaceName} because ${previousOwnerName} is no longer in the channel. You can manage its members and settings.`,
} as const;

export enum PRIVATE_CHANNEL_EVENT_TYPE {
  MEMBERS_CHANGED = 'channel_members_changed',
}
