const RECORDER_MIME_TYPES = [
  "audio/webm;codecs=opus",
  "audio/mp4;codecs=mp4a.40.2",
  "audio/mp4",
  "audio/ogg;codecs=opus",
  "audio/webm",
  "audio/ogg",
];

export function preferredRecordingType(
  supported: (mime: string) => boolean,
): string | undefined {
  return RECORDER_MIME_TYPES.find(supported);
}

export function recordingFormat(mime: string): {
  mimeType: string;
  extension: string;
} {
  const mimeType = mime.split(";", 1)[0].trim().toLowerCase();
  const extensions: Record<string, string> = {
    "audio/webm": "webm",
    "audio/mp4": "m4a",
    "audio/ogg": "ogg",
    "audio/wav": "wav",
  };
  if (!Object.hasOwn(extensions, mimeType))
    throw new Error("Unsupported audio recording format");
  return { mimeType, extension: extensions[mimeType] };
}

export function formatVoiceTime(seconds: number): string {
  const total =
    Number.isFinite(seconds) && seconds > 0 ? Math.floor(seconds) : 0;
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

export function waveformPeaks(samples: Float32Array, count: number): number[] {
  if (!samples.length || count < 1) return [];
  const peaks = Array.from({ length: count }, (_, bar) => {
    const start = Math.floor((bar * samples.length) / count);
    const end = Math.max(
      start + 1,
      Math.floor(((bar + 1) * samples.length) / count),
    );
    let peak = 0;
    for (let i = start; i < Math.min(end, samples.length); i++)
      peak = Math.max(peak, Math.abs(samples[i]));
    return peak;
  });
  const maximum = Math.max(...peaks);
  return peaks.map((peak) => (maximum ? peak / maximum : 0));
}
