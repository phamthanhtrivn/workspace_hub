const AUDIO_FILE_EXTENSION = /\.(mp3|m4a|wav|ogg|flac|aac)$/i;

export function isTranscriptAudio(media: {
  mimeType: string;
  name?: string;
}): boolean {
  return (
    media.mimeType.startsWith('audio/') ||
    (media.mimeType === 'application/octet-stream' &&
      AUDIO_FILE_EXTENSION.test(media.name ?? ''))
  );
}
