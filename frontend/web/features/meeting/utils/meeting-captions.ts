import type { MeetingCaption } from "../types/meeting-captions.types";

export function parseCaption(
  payload: Uint8Array,
  now: number,
): MeetingCaption | null {
  if (payload.byteLength > 8192) return null;
  try {
    const data = JSON.parse(new TextDecoder().decode(payload));
    if (
      data.type !== "caption" ||
      typeof data.speakerId !== "string" ||
      typeof data.speakerName !== "string" ||
      typeof data.trackId !== "string" ||
      typeof data.text !== "string" ||
      !data.text.trim() ||
      data.text.length > 800 ||
      typeof data.final !== "boolean" ||
      !Number.isSafeInteger(data.sequence) ||
      data.sequence < 1
    )
      return null;
    return {
      speakerId: data.speakerId,
      speakerName: data.speakerName.slice(0, 120),
      trackId: data.trackId,
      text: data.text,
      final: data.final,
      sequence: data.sequence,
      receivedAt: now,
    };
  } catch {
    return null;
  }
}

export function updateCaptions(
  current: MeetingCaption[],
  next: MeetingCaption,
): MeetingCaption[] {
  const old = current.find((caption) => caption.trackId === next.trackId);
  if (old && old.sequence >= next.sequence) return current;
  return [
    ...current.filter((caption) => caption.speakerId !== next.speakerId),
    next,
  ].slice(-3);
}

export function isCaptionWorker(identity: string) {
  return identity.startsWith("captions:");
}
