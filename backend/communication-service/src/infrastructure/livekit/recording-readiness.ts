export const RECORDING_PROBE = { timeoutMs: 2500, cacheMs: 5000 } as const;

export type RecordingReadiness = {
  ready: boolean;
  code: 'RECORDING_UNAVAILABLE' | 'RECORDING_NOT_CONFIGURED' | null;
  reason: string | null;
};

const unavailable: RecordingReadiness = {
  ready: false,
  code: 'RECORDING_UNAVAILABLE',
  reason: 'Recording service is unavailable. Please try again shortly.',
};

/** Probe the recorder itself: LiveKit's ListEgress works even without an Egress worker. */
export class RecordingReadinessProbe {
  private cached?: {
    url: string;
    expiresAt: number;
    result: RecordingReadiness;
  };
  private pending?: { url: string; result: Promise<RecordingReadiness> };

  constructor(
    private readonly request: typeof fetch = (
      input: string | URL | Request,
      init?: RequestInit,
    ) => fetch(input, init),
    private readonly now: () => number = Date.now,
  ) {}

  async check(configured: boolean, url: string): Promise<RecordingReadiness> {
    if (!configured || !url)
      return {
        ready: false,
        code: 'RECORDING_NOT_CONFIGURED',
        reason: 'Recording service is not configured',
      };
    if (this.cached?.url === url && this.cached.expiresAt > this.now())
      return this.cached.result;
    if (this.pending?.url === url) return this.pending.result;
    const result = this.probe(url);
    this.pending = { url, result };
    try {
      const readiness = await result;
      this.cached = {
        url,
        expiresAt: this.now() + RECORDING_PROBE.cacheMs,
        result: readiness,
      };

      return readiness;
    } finally {
      if (this.pending?.result === result) this.pending = undefined;
    }
  }

  private async probe(url: string): Promise<RecordingReadiness> {
    try {
      const response = await this.request(url, {
        signal: AbortSignal.timeout(RECORDING_PROBE.timeoutMs),
        redirect: 'error',
      });
      await response.body?.cancel();

      return response.ok
        ? { ready: true, code: null, reason: null }
        : unavailable;
    } catch {
      return unavailable;
    }
  }
}
