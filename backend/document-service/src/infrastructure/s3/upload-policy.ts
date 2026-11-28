import { BadRequestException } from '@nestjs/common';
import { extname } from 'node:path';

export const UPLOAD_POLICY = {
  MAX_SIZE_BYTES: 10 * 1024 * 1024,
  URL_LIFETIME_SECONDS: 600,
  SIGNATURE_BYTES: 1024,
  MAX_NAME_LENGTH: 255,
} as const;

const MIME_EXTENSIONS: Record<string, string[]> = {
  'application/pdf': ['.pdf'],
  'image/png': ['.png'],
  'image/jpeg': ['.jpg', '.jpeg', '.jpe'],
  'image/gif': ['.gif'],
  'image/webp': ['.webp'],
};
const FORBIDDEN_EXTENSIONS = new Set(['.exe', '.dll', '.com', '.scr', '.msi']);

export interface UploadScope {
  actorId: string;
  publicDocumentId?: string;
}

export interface UploadConfirmation extends UploadScope {
  mimeType: string;
  target: string;
}

export function validateUploadMetadata(name: string, mimeType: string) {
  const extension = extname(name).toLowerCase();
  if (
    !name.trim() ||
    name.length > UPLOAD_POLICY.MAX_NAME_LENGTH ||
    name === '.' ||
    name === '..' ||
    /[/\\]/u.test(name) ||
    [...name].some(
      (character) =>
        character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127,
    ) ||
    FORBIDDEN_EXTENSIONS.has(extension) ||
    !/^[a-z0-9!#$&^_.+-]+\/[a-z0-9!#$&^_.+-]+$/i.test(mimeType) ||
    (MIME_EXTENSIONS[mimeType] &&
      !MIME_EXTENSIONS[mimeType].includes(extension)) ||
    Object.entries(MIME_EXTENSIONS).some(
      ([type, extensions]) =>
        extensions.includes(extension) && type !== mimeType,
    )
  ) {
    throw new BadRequestException('Invalid upload file name or content type');
  }
}

export function validateUploadContent(bytes: Buffer, mimeType: string) {
  const starts = (signature: number[]) =>
    bytes.subarray(0, signature.length).equals(Buffer.from(signature));
  // Executable binaries remain unsafe even if the caller declares generic data.
  const executable =
    starts([0x4d, 0x5a]) ||
    starts([0x7f, 0x45, 0x4c, 0x46]) ||
    starts([0xcf, 0xfa, 0xed, 0xfe]) ||
    starts([0xfe, 0xed, 0xfa, 0xcf]);
  const signatures: Record<string, () => boolean> = {
    'application/pdf': () => bytes.subarray(0, 5).toString('ascii') === '%PDF-',
    'image/png': () => starts([137, 80, 78, 71, 13, 10, 26, 10]),
    'image/jpeg': () => starts([255, 216, 255]),
    'image/gif': () =>
      /^GIF8[79]a/.test(bytes.subarray(0, 6).toString('ascii')),
    'image/webp': () =>
      bytes.subarray(0, 4).toString('ascii') === 'RIFF' &&
      bytes.subarray(8, 12).toString('ascii') === 'WEBP',
    'video/mp4': () => bytes.subarray(4, 8).toString('ascii') === 'ftyp',
    'audio/mp4': () => bytes.subarray(4, 8).toString('ascii') === 'ftyp',
    'video/quicktime': () =>
      ['ftyp', 'moov', 'mdat', 'wide', 'free'].includes(
        bytes.subarray(4, 8).toString('ascii'),
      ),
    'video/webm': () => starts([0x1a, 0x45, 0xdf, 0xa3]),
    'audio/webm': () => starts([0x1a, 0x45, 0xdf, 0xa3]),
    'audio/wav': () =>
      bytes.subarray(0, 4).toString('ascii') === 'RIFF' &&
      bytes.subarray(8, 12).toString('ascii') === 'WAVE',
    'audio/mpeg': () =>
      bytes.subarray(0, 3).toString('ascii') === 'ID3' ||
      (bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0),
    'audio/ogg': () => bytes.subarray(0, 4).toString('ascii') === 'OggS',
    'video/ogg': () => bytes.subarray(0, 4).toString('ascii') === 'OggS',
    'application/gzip': () => starts([0x1f, 0x8b]),
    'application/x-7z-compressed': () =>
      starts([0x37, 0x7a, 0xbc, 0xaf, 0x27, 0x1c]),
    'application/zip': () => starts([80, 75, 3, 4]) || starts([80, 75, 5, 6]),
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
      () => starts([80, 75, 3, 4]),
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': () =>
      starts([80, 75, 3, 4]),
    'application/vnd.openxmlformats-officedocument.presentationml.presentation':
      () => starts([80, 75, 3, 4]),
  };
  if (
    executable ||
    (signatures[mimeType] && !signatures[mimeType]()) ||
    (mimeType.startsWith('text/') && bytes.includes(0))
  ) {
    throw new BadRequestException('Uploaded content does not match its type');
  }
}
