import { MESSAGE_MEDIA_TYPE } from '../types/file.enums';
import { UPLOAD_POLICY } from '../../infrastructure/s3/attachment-upload.policy';
import { MEDIA_API_PATH, MEDIA_ACCESS_ROUTE } from '../types/media.constants';

export const MAX_FILE_SIZE = UPLOAD_POLICY.MAX_SIZE_BYTES;

export const getMediaUrl = (s3Key: string): string => {
  if (!s3Key) return '';
  return `/${MEDIA_API_PATH}/${MEDIA_ACCESS_ROUTE}?key=${encodeURIComponent(s3Key)}`;
};

export function mapMediaWithUrl<T extends { s3Key: string }>(
  medias: T[],
): Array<T & { fileUrl: string }>;
export function mapMediaWithUrl<T extends { s3Key: string }>(
  medias: T[] | null | undefined,
): Array<T & { fileUrl: string }> | null | undefined;
export function mapMediaWithUrl<T extends { s3Key: string }>(
  medias: T[] | null | undefined,
) {
  if (!medias || !Array.isArray(medias)) return medias;
  return medias.map((m) => ({
    ...m,
    fileUrl: getMediaUrl(m.s3Key),
  }));
}

export function getMediaType(mimeType: string): MESSAGE_MEDIA_TYPE {
  if (mimeType.startsWith('image/')) {
    return MESSAGE_MEDIA_TYPE.IMAGE;
  }

  if (mimeType.startsWith('video/')) {
    return MESSAGE_MEDIA_TYPE.VIDEO;
  }

  return MESSAGE_MEDIA_TYPE.FILE;
}
