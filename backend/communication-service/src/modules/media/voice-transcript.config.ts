export function isVoiceTranscriptionEnabled(): boolean {
  return (
    (process.env.VOICE_TRANSCRIPTION_ENABLED ??
      process.env.MEETING_SUMMARY_ENABLED) === 'true'
  );
}
