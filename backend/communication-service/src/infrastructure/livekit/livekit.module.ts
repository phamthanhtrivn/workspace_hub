import { Module } from '@nestjs/common';
import { LIVEKIT_CONFIG } from './livekit.constants';
import {
  liveKitConfigProvider,
  liveKitRoomServiceClientProvider,
} from './livekit.providers';

@Module({
  providers: [liveKitConfigProvider, liveKitRoomServiceClientProvider],
  exports: [LIVEKIT_CONFIG, liveKitRoomServiceClientProvider],
})
export class LiveKitModule {}
