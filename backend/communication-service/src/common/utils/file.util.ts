export const MAX_FILE_SIZE = 100 * 1024 * 1024;

export const getMediaUrl = (s3Key: string): string => {
  if (!s3Key) return '';
  const cloudFrontUrl = process.env.AWS_CLOUDFRONT_URL;
  return cloudFrontUrl ? `${cloudFrontUrl}/${s3Key}` : s3Key;
};

export const mapMediaWithUrl = (medias: any[]): any[] => {
  if (!medias || !Array.isArray(medias)) return medias;
  return medias.map((m) => ({
    ...m,
    fileUrl: getMediaUrl(m.s3Key),
  }));
};
