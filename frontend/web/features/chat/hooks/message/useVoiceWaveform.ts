"use client";
import { useQuery } from "@tanstack/react-query";
import { useAppSelector } from "@/store/store";
import { fetchStorageAsset } from "@/features/storage/api/storage.api";
import { VOICE } from "../../constants/voice.constants";
import { waveformPeaks } from "../../utils/voice-audio";

export function useVoiceWaveform(
  mediaId: string,
  reference: string,
  enabled: boolean,
) {
  const userId = useAppSelector((state) => state.auth.userId);
  return useQuery({
    queryKey: ["voice-waveform", userId, mediaId, reference],
    enabled: !!userId && !!reference && enabled,
    staleTime: Infinity,
    gcTime: 60000,
    retry: false,
    refetchOnWindowFocus: false,
    queryFn: async ({ signal }) => {
      const response = await fetchStorageAsset(reference, signal);
      const reader = response.body?.getReader();
      if (!reader) throw new Error("Audio is unavailable");
      const parts: Uint8Array[] = [];
      let size = 0;
      try {
        while (true) {
          const part = await reader.read();
          if (part.done) break;
          signal.throwIfAborted();
          size += part.value.length;
          if (size > VOICE.waveformBytes)
            throw new Error("Audio is too large for waveform preview");
          parts.push(part.value);
        }
      } finally {
        await reader.cancel().catch(() => undefined);
      }
      const audio = new Uint8Array(size);
      let offset = 0;
      for (const part of parts) {
        audio.set(part, offset);
        offset += part.length;
      }
      const context = new OfflineAudioContext(1, 1, 16000);
      const decoded = await context.decodeAudioData(audio.buffer);
      signal.throwIfAborted();
      return {
        duration: decoded.duration,
        peaks: waveformPeaks(decoded.getChannelData(0), VOICE.waveformBars),
      };
    },
  });
}
