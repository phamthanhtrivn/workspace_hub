import {
  SpaceResponse,
  SpaceSettingResponse,
} from "../types/chat.types";

export const DEFAULT_SPACE_SETTING: SpaceSettingResponse = {
  id: null,
  spaceId: null,
  allowMemberCreateChannel: true,
  allowMemberDeleteOwnChannel: false,
};

export function normalizeSpaceSetting(
  setting?: Partial<SpaceSettingResponse> | null,
  spaceId?: string | null,
): SpaceSettingResponse {
  return {
    ...DEFAULT_SPACE_SETTING,
    ...setting,
    spaceId: setting?.spaceId ?? spaceId ?? null,
    allowMemberCreateChannel:
      setting?.allowMemberCreateChannel ??
      DEFAULT_SPACE_SETTING.allowMemberCreateChannel,
    allowMemberDeleteOwnChannel:
      setting?.allowMemberDeleteOwnChannel ??
      DEFAULT_SPACE_SETTING.allowMemberDeleteOwnChannel,
  };
}

export function normalizeSpace(space: SpaceResponse): SpaceResponse {
  return {
    ...space,
    setting: normalizeSpaceSetting(space.setting, space.id),
  };
}

export function canMembersCreateChannels(space?: SpaceResponse | null) {
  return normalizeSpaceSetting(space?.setting, space?.id)
    .allowMemberCreateChannel;
}
