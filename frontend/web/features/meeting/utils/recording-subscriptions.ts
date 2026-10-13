type RecordingPublication = {
  trackSid: string;
  kind: string;
  source: string;
  isDesired: boolean;
  setSubscribed: (enabled: boolean) => void;
};

/** Camera layouts record microphones; screen-only also includes shared audio. */
export function syncRecordingSubscriptions(
  publications: RecordingPublication[],
  visibleVideoIds: ReadonlySet<string>,
  includeSharedAudio = false,
) {
  for (const publication of publications) {
    const desired =
      publication.kind === "audio"
        ? includeSharedAudio || publication.source === "microphone"
        : visibleVideoIds.has(publication.trackSid);
    if (publication.isDesired !== desired) publication.setSubscribed(desired);
  }
}
