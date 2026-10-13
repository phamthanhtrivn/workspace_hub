import { Injectable } from '@nestjs/common';
import {
  AccessToken,
  RoomServiceClient,
  WebhookReceiver,
  EgressClient,
  StartEgressRequest,
  EncodingOptionsPreset,
  EncodedFileType,
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

  isRecordingConfigured(): boolean {
    return (
      process.env.MEETING_RECORDING_ENABLED === 'true' &&
      this.isConfigured() &&
      Boolean(
        process.env.AWS_S3_BUCKET_NAME &&
        process.env.JWT_SECRET_KEY &&
        process.env.AWS_REGION &&
        process.env.AWS_ACCESS_KEY &&
        process.env.AWS_SECRET_KEY &&
        process.env.LIVEKIT_EGRESS_WEBHOOK_URL,
      )
    );
  }

  createEgressClient(): EgressClient {
    return new EgressClient(
      this.config.url,
      this.config.apiKey,
      this.config.apiSecret,
      { requestTimeout: 20 },
    );
  }

  startRecording(roomName: string, s3Key: string, layout: string) {
    return this.createEgressClient().startEgress(
      new StartEgressRequest({
        roomName,
        source: {
          case: 'template',
          value: {
            layout: layout === 'grid' ? 'grid' : 'speaker',
            customBaseUrl: process.env.LIVEKIT_RECORDING_TEMPLATE_URL || '',
          },
        },
        encoding: { case: 'preset', value: EncodingOptionsPreset.H264_720P_30 },
        outputs: [
          {
            config: {
              case: 'file',
              value: {
                filepath: s3Key,
                fileType: EncodedFileType.MP4,
                disableManifest: true,
              },
            },
          },
        ],
        storage: {
          provider: {
            case: 's3',
            value: {
              bucket: process.env.AWS_S3_BUCKET_NAME!,
              region: process.env.AWS_REGION!,
              accessKey: process.env.AWS_ACCESS_KEY!,
              secret: process.env.AWS_SECRET_KEY!,
              endpoint: process.env.AWS_S3_ENDPOINT || '',
              forcePathStyle: process.env.AWS_S3_FORCE_PATH_STYLE === 'true',
            },
          },
        },
        webhooks: [
          {
            url: process.env.LIVEKIT_EGRESS_WEBHOOK_URL!,
            signingKey: this.config.apiKey,
          },
        ],
      }),
    );
  }

  listRecordings(roomName?: string, egressId?: string) {
    return this.createEgressClient().listEgress({ roomName, egressId });
  }

  stopRecording(egressId: string) {
    return this.createEgressClient().stopEgress(egressId);
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
