export enum PrivateChannelMembershipAction {
  ADDED = 'ADDED',
  LEFT = 'LEFT',
  REMOVED = 'REMOVED',
  SPACE_LEFT = 'SPACE_LEFT',
  SPACE_REMOVED = 'SPACE_REMOVED',
  PROJECT_REMOVED = 'PROJECT_REMOVED',
  OWNER_TRANSFERRED = 'OWNER_TRANSFERRED',
}

export interface PrivateChannelMembershipEvent {
  action: PrivateChannelMembershipAction;
  userId: string;
}

export const PRIVATE_CHANNEL_SYSTEM_MESSAGE_TEXT = {
  [PrivateChannelMembershipAction.ADDED]: (actor: string, member: string) =>
    `${actor} added ${member} to the channel`,
  [PrivateChannelMembershipAction.LEFT]: (_actor: string, member: string) =>
    `${member} left the channel`,
  [PrivateChannelMembershipAction.REMOVED]: (actor: string, member: string) =>
    `${actor} removed ${member} from the channel`,
  [PrivateChannelMembershipAction.SPACE_LEFT]: (
    _actor: string,
    member: string,
  ) => `${member} left the channel after leaving the space`,
  [PrivateChannelMembershipAction.SPACE_REMOVED]: (
    actor: string,
    member: string,
  ) =>
    `${member} was removed from the channel after ${actor} removed them from the space`,
  [PrivateChannelMembershipAction.PROJECT_REMOVED]: (
    _actor: string,
    member: string,
  ) =>
    `${member} was removed from the channel because they are no longer a project member`,
  [PrivateChannelMembershipAction.OWNER_TRANSFERRED]: (
    _actor: string,
    member: string,
  ) => `${member} is now the channel owner`,
};
