import * as path from 'path';
import { randomUUID } from 'crypto';
import { S3_UPLOAD_TYPE } from '../types/file.enums';

const cleanFileName = (fileName: string): string => {
  const baseName = path.basename(fileName, path.extname(fileName));
  const extension = path.extname(fileName).toLowerCase();
  const normalizedBaseName = baseName
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, '_')
    .replace(/_{2,}/g, '_');

  return `${normalizedBaseName || 'file'}${extension}`;
};

export const generateS3Key = (
  type: S3_UPLOAD_TYPE,
  referenceId: string,
  fileName: string,
): string => {
  const safeFileName = cleanFileName(fileName);
  return `${type}/${referenceId}/${randomUUID()}_${safeFileName}`;
};
