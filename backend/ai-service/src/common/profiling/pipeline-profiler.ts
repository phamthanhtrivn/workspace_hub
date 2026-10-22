type Stage =
  | "authorize_ms"
  | "download_ms"
  | "encode_ms"
  | "rag_ms"
  | "finalize_ms"
  | "processing_ms"
  | "queue_wait_ms"
  | "job_age_ms"
  | "attempt";
type Operation =
  | "index"
  | "preflight"
  | "job_index"
  | "job_summary"
  | "job_cleanup";

export class Profile {
  private readonly started = performance.now();
  private readonly values: Partial<Record<Stage, number>> = {};
  constructor(private readonly operation: Operation) {}

  set(stage: Stage, value: number) {
    if (Number.isFinite(value)) this.values[stage] = Math.max(0, value);
  }

  async measure<T>(stage: Stage, run: () => T | Promise<T>): Promise<T> {
    const started = performance.now();
    try {
      return await run();
    } finally {
      this.set(stage, (this.values[stage] || 0) + performance.now() - started);
    }
  }

  finish(status: "ok" | "failed") {
    const metrics = Object.fromEntries(
      Object.entries(this.values).map(([key, value]) => [
        key,
        Math.round(value * 100) / 100,
      ]),
    );
    console.info(
      JSON.stringify({
        event: "ai_pipeline",
        operation: this.operation,
        status,
        ...metrics,
        total_ms: Math.round((performance.now() - this.started) * 100) / 100,
      }),
    );
  }
}

export async function profiled<T>(
  operation: Operation,
  run: (timing: Profile) => Promise<T>,
): Promise<T> {
  const timing = new Profile(operation);
  try {
    const result = await run(timing);
    timing.finish("ok");
    return result;
  } catch (error) {
    timing.finish("failed");
    throw error;
  }
}
