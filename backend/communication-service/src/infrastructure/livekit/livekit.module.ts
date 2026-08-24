import { Module } from '@nestjs/common';
import {
  liveKitConfigProvider,
  liveKitRoomServiceClientProvider,
} from './livekit.providers';

@Module({
  providers: [liveKitConfigProvider, liveKitRoomServiceClientProvider],
  exports: [liveKitRoomServiceClientProvider],
})
export class LiveKitModule {}
