import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
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
  return `${type}/${referenceId}/${uuidv4()}_${safeFileName}`;
};
