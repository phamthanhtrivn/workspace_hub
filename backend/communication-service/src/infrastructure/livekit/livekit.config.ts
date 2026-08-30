export interface LiveKitConfig {
  url: string;
  apiKey: string;
  apiSecret: string;
}

export function getLiveKitConfig(): LiveKitConfig {
  return {
    url: process.env.LIVEKIT_URL!,
    apiKey: process.env.LIVEKIT_API_KEY!,
    apiSecret: process.env.LIVEKIT_API_SECRET!,
  };
}
