import { Provider } from '@nestjs/common';
import { RoomServiceClient } from 'livekit-server-sdk';
import {
  LIVEKIT_CONFIG,
  LIVEKIT_ROOM_SERVICE_CLIENT,
} from './livekit.constants';
import { getLiveKitConfig } from './livekit.config';
import { LiveKitConfig } from './livekit.types';

export const liveKitConfigProvider: Provider<LiveKitConfig> = {
  provide: LIVEKIT_CONFIG,
  useFactory: getLiveKitConfig,
};

export const liveKitRoomServiceClientProvider: Provider<RoomServiceClient> = {
  provide: LIVEKIT_ROOM_SERVICE_CLIENT,
  useFactory: (config: LiveKitConfig): RoomServiceClient =>
    new RoomServiceClient(config.url, config.apiKey, config.apiSecret),
  inject: [LIVEKIT_CONFIG],
};
