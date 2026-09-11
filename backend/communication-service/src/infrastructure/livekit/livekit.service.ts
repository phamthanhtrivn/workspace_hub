import { Injectable } from '@nestjs/common';
import {
  AccessToken,
  RoomServiceClient,
  TrackSource,
  WebhookReceiver,
} from 'livekit-server-sdk';
import { getLiveKitConfig, LiveKitConfig } from './livekit.config';
import {
  LiveKitParticipantTokenParams,
  LiveKitRoomMetadata,
} from './types/livekit.types';
import {
  BASE_PUBLISH_SOURCES,
  LIVEKIT_ROOM_DEPARTURE_TIMEOUT_SECONDS,
  LIVEKIT_ROOM_EMPTY_TIMEOUT_SECONDS,
  SCREEN_SHARE_PUBLISH_SOURCES,
} from './types/livekit.constants';

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
      emptyTimeout: LIVEKIT_ROOM_EMPTY_TIMEOUT_SECONDS,
      departureTimeout: LIVEKIT_ROOM_DEPARTURE_TIMEOUT_SECONDS,
      metadata: metadata ? JSON.stringify(metadata) : undefined,
    });
  }

  async receiveWebhook(body: string, authorization?: string) {
    const receiver = new WebhookReceiver(
      this.config.apiKey,
      this.config.apiSecret,
    );

    return receiver.receive(body, authorization);
  }

  async deleteRoom(roomName: string): Promise<void> {
    await this.createRoomServiceClient().deleteRoom(roomName);
  }

  async removeParticipant(roomName: string, userId: string): Promise<void> {
    await this.createRoomServiceClient().removeParticipant(roomName, userId);
  }

  async updateParticipantMetadata({
    roomName,
    userId,
    role,
    displayName,
    avatarUrl,
  }: {
    roomName: string;
    userId: string;
    role: string;
    displayName?: string | null;
    avatarUrl?: string | null;
  }): Promise<void> {
    await this.createRoomServiceClient().updateParticipant(roomName, userId, {
      name: displayName ?? undefined,
      metadata: JSON.stringify({
        role,
        avatarUrl: avatarUrl ?? null,
      }),
    });
  }

  async updateParticipantPublishPermissions({
    roomName,
    userId,
    canShareScreen,
  }: {
    roomName: string;
    userId: string;
    canShareScreen: boolean;
  }): Promise<void> {
    await this.createRoomServiceClient().updateParticipant(roomName, userId, {
      permission: {
        canPublish: true,
        canSubscribe: true,
        canPublishData: true,
        canPublishSources: canShareScreen
          ? [...SCREEN_SHARE_PUBLISH_SOURCES]
          : [...BASE_PUBLISH_SOURCES],
      },
    });
  }

  async createParticipantToken({
    roomName,
    userId,
    displayName,
    avatarUrl,
    role,
    deviceSettings,
    canShareScreen = false,
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
      canPublishSources: canShareScreen
        ? [...SCREEN_SHARE_PUBLISH_SOURCES]
        : [...BASE_PUBLISH_SOURCES],
    });

    return token.toJwt();
  }
}
