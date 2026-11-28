import type { Response } from "express";

/** Interval at which long-running streams send a comment frame to keep proxies open. */
export const SSE_HEARTBEAT_MS = 15000;

export function startEventStream(res: Response) {
  res.status(200).set({
    "content-type": "text/event-stream; charset=utf-8",
    "cache-control": "no-cache, no-transform",
    "x-accel-buffering": "no",
  });
  res.flushHeaders();
}

function writable(res: Response) {
  return !res.destroyed && !res.writableEnded;
}

export function event(res: Response, name: string, data: unknown) {
  if (writable(res))
    res.write(`event: ${name}\ndata: ${JSON.stringify(data)}\n\n`);
}

export function heartbeat(res: Response) {
  if (writable(res)) res.write(": heartbeat\n\n");
}
