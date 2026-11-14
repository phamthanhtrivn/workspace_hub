const SUMMARY_READINESS = {
  cacheMs: 5000,
  timeoutMs: 2500,
  heartbeat: "ready:meeting-v1",
} as const;

export class MeetingSummaryReadiness {
  private cache?: { expiresAt: number; ready: boolean };
  private pending?: Promise<boolean>;

  constructor(
    private readonly heartbeat: () => Promise<string | null>,
    private readonly speechUrl: string,
    private readonly speechKey: string,
    private readonly request: typeof fetch = (
      input: string | URL | Request,
      init?: RequestInit,
    ) => fetch(input, init),
    private readonly now: () => number = Date.now,
  ) {}

  async check(): Promise<boolean> {
    if (this.cache && this.cache.expiresAt > this.now())
      return this.cache.ready;
    if (this.pending) return this.pending;
    const pending = this.probe();
    this.pending = pending;
    try {
      const ready = await pending;
      this.cache = { ready, expiresAt: this.now() + SUMMARY_READINESS.cacheMs };

      return ready;
    } finally {
      if (this.pending === pending) this.pending = undefined;
    }
  }

  private async probe() {
    try {
      if ((await this.heartbeat()) !== SUMMARY_READINESS.heartbeat)
        return false;
      const response = await this.request(
        `${this.speechUrl.replace(/\/$/, "")}/ready`,
        {
          headers: { "x-internal-service-key": this.speechKey },
          redirect: "error",
          signal: AbortSignal.timeout(SUMMARY_READINESS.timeoutMs),
        },
      );
      await response.body?.cancel();

      return response.ok;
    } catch {
      return false;
    }
  }
}
