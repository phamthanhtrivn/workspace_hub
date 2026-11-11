export class VisionLimiter {
  private active = 0;
  private readonly queue: (() => void)[] = [];

  constructor(private readonly limit: number) {
    if (!Number.isInteger(limit) || limit < 1)
      throw new Error("Invalid Vision concurrency");
  }

  run<T>(work: () => Promise<T>, signal: AbortSignal): Promise<T> {
    signal.throwIfAborted();

    return new Promise<T>((resolve, reject) => {
      const cancel = () => {
        const index = this.queue.indexOf(start);
        if (index >= 0) {
          this.queue.splice(index, 1);
          reject(signal.reason);
        }
      };
      const start = () => {
        signal.removeEventListener("abort", cancel);
        if (signal.aborted) {
          reject(signal.reason);

          return;
        }
        this.active++;
        void Promise.resolve()
          .then(() => {
            signal.throwIfAborted();

            return work();
          })
          .then(resolve, reject)
          .finally(() => {
            this.active--;
            while (this.active < this.limit && this.queue.length)
              this.queue.shift()!();
          });
      };
      if (this.active < this.limit) start();
      else {
        this.queue.push(start);
        signal.addEventListener("abort", cancel, { once: true });
      }
    });
  }
}

export async function mapVisionImages<T, R>(
  items: T[],
  concurrency: number,
  process: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  if (!Number.isInteger(concurrency) || concurrency < 1)
    throw new Error("Invalid Vision concurrency");
  const result = new Array<R>(items.length);
  let cursor = 0;
  let failed = false;
  let failure: unknown;
  const workers = Array.from(
    { length: Math.min(items.length, concurrency) },
    async () => {
      while (!failed) {
        const index = cursor++;
        if (index >= items.length) return;
        try {
          result[index] = await process(items[index], index);
        } catch (error) {
          if (!failed) failure = error;
          failed = true;
        }
      }
    },
  );
  // Let in-flight images finish and checkpoint before reporting a sibling failure.
  await Promise.all(workers);
  if (failed) throw failure;

  return result;
}
