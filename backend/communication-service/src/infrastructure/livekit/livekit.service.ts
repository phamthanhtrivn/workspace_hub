import { Injectable } from '@nestjs/common';
import { AccessToken, RoomServiceClient } from 'livekit-server-sdk';
import { getLiveKitConfig, LiveKitConfig } from './livekit.config';

export interface LiveKitParticipantTokenParams {
  roomName: string;
  userId: string;
  displayName?: string;
  avatarUrl?: string;
  role: string;
  deviceSettings?: {
    cameraEnabled: boolean;
    microphoneEnabled: boolean;
    cameraDeviceId?: string;
    microphoneDeviceId?: string;
  };
}

export interface LiveKitRoomMetadata {
  meetingType?: string;
  createdBy?: string;
  autoAdmit?: boolean;
  [key: string]: string | number | boolean | null | undefined;
}

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
    return this.config.publicUrl;
  }

  async createRoom(roomName: string, metadata?: LiveKitRoomMetadata) {
    return this.createRoomServiceClient().createRoom({
      name: roomName,
      metadata: metadata ? JSON.stringify(metadata) : undefined,
    });
  }

  async createParticipantToken({
    roomName,
    userId,
    displayName,
    avatarUrl,
    role,
    deviceSettings,
  }: LiveKitParticipantTokenParams): Promise<string> {
    const token = new AccessToken(this.config.apiKey, this.config.apiSecret, {
      identity: userId,
      name: displayName,
      metadata: JSON.stringify({
        role,
        avatarUrl,
        deviceSettings,
      }),
    });

    token.addGrant({
      room: roomName,
      roomJoin: true,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    });

    return token.toJwt();
  }
}
