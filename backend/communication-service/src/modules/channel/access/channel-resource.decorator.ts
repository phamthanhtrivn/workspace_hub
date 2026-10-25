import { SetMetadata } from '@nestjs/common';

export const CHANNEL_RESOURCE_KEY = 'channel-resource';
export interface ChannelResourceOptions {
  kind: 'channel' | 'message';
  parameter: string;
}
export const ChannelResource = (
  kind: ChannelResourceOptions['kind'],
  parameter = 'id',
) =>
  SetMetadata(CHANNEL_RESOURCE_KEY, {
    kind,
    parameter,
  } satisfies ChannelResourceOptions);

export const SkipChannelResource = () =>
  SetMetadata(CHANNEL_RESOURCE_KEY, null);
