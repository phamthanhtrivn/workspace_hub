import { Injectable } from '@nestjs/common';
import { RoomServiceClient } from 'livekit-server-sdk';
import { getLiveKitConfig, LiveKitConfig } from './livekit.config';

@Injectable()
export class LiveKitService {
  private readonly config: LiveKitConfig;

  constructor() {
    this.config = getLiveKitConfig();
  }

  isConfigured(): boolean {
    return Boolean(
      this.config.url && this.config.apiKey && this.config.apiSecret,
    );
  }

  createRoomServiceClient(): RoomServiceClient {
    return new RoomServiceClient(
      this.config.url,
      this.config.apiKey,
      this.config.apiSecret,
    );
  }

  getServerUrl(): string {
    return this.config.url;
  }
}
