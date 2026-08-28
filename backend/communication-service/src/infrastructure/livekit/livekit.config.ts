import { LiveKitEnvironmentKey } from './livekit.constants';
import { LiveKitConfig } from './livekit.types';

const readRequiredEnvironmentValue = (key: LiveKitEnvironmentKey): string => {
  const value = process.env[key]?.trim();

  if (!value) {
    throw new Error(`Missing required LiveKit environment variable: ${key}`);
  }

  return value;
};

const readOptionalEnvironmentValue = (
  key: LiveKitEnvironmentKey,
): string | undefined => process.env[key]?.trim() || undefined;

export const getLiveKitConfig = (): LiveKitConfig => ({
  url: readRequiredEnvironmentValue(LiveKitEnvironmentKey.URL),
  publicUrl:
    readOptionalEnvironmentValue(LiveKitEnvironmentKey.PUBLIC_URL) ??
    readRequiredEnvironmentValue(LiveKitEnvironmentKey.URL),
  apiKey: readRequiredEnvironmentValue(LiveKitEnvironmentKey.API_KEY),
  apiSecret: readRequiredEnvironmentValue(LiveKitEnvironmentKey.API_SECRET),
});
