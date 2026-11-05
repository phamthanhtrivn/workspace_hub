import { Injectable, NotFoundException, ServiceUnavailableException, type OnModuleDestroy } from '@nestjs/common';
import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { PrismaService } from '../../prisma/prisma.service';
import { POMODORO_AUDIO_MESSAGES, POMODORO_AUDIO_S3_PREFIX, POMODORO_AUDIO_URL_TTL_SECONDS } from './constants/pomodoro-audio.constants';

@Injectable()
export class PomodoroAudioAccessService implements OnModuleDestroy {
  private readonly storage = new S3Client({
    region: process.env.AWS_REGION,
    credentials: process.env.AWS_ACCESS_KEY && process.env.AWS_SECRET_KEY
      ? { accessKeyId: process.env.AWS_ACCESS_KEY, secretAccessKey: process.env.AWS_SECRET_KEY }
      : undefined,
  });

  constructor(private readonly prisma: PrismaService) {}

  onModuleDestroy() { this.storage.destroy(); }

  async getAccessUrl(id: string) {
    if (!process.env.AWS_S3_BUCKET_NAME || !process.env.AWS_REGION) {
      throw new ServiceUnavailableException(POMODORO_AUDIO_MESSAGES.configurationMissing);
    }
    const audio = await this.prisma.pomodoroAudio.findFirst({ where: { id, isActive: true }, select: { s3Key: true } });
    if (!audio || !audio.s3Key.startsWith(POMODORO_AUDIO_S3_PREFIX) || /(^|\/)\.\.?($|\/)/.test(audio.s3Key)) {
      throw new NotFoundException(POMODORO_AUDIO_MESSAGES.unavailable);
    }
    const url = await getSignedUrl(this.storage,
      new GetObjectCommand({ Bucket: process.env.AWS_S3_BUCKET_NAME, Key: audio.s3Key }),
      { expiresIn: POMODORO_AUDIO_URL_TTL_SECONDS });
    return { data: { url, expiresAt: new Date(Date.now() + POMODORO_AUDIO_URL_TTL_SECONDS * 1000).toISOString() } };
  }
}
