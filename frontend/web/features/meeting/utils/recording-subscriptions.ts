type RecordingPublication = {
  trackSid: string;
  kind: string;
  isDesired: boolean;
  setSubscribed: (enabled: boolean) => void;
};

/** Subscribe to all meeting audio and only the video tiles in the recording. */
export function syncRecordingSubscriptions(
  publications: RecordingPublication[],
  visibleVideoIds: ReadonlySet<string>,
) {
  for (const publication of publications) {
    const desired =
      publication.kind === "audio" || visibleVideoIds.has(publication.trackSid);
    if (publication.isDesired !== desired) publication.setSubscribed(desired);
  }
}
