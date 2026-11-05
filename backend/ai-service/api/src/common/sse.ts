import type { Response } from "express";

export function startEventStream(res: Response) {
  res.status(200).set({
    "content-type": "text/event-stream; charset=utf-8",
    "cache-control": "no-cache, no-transform",
    "x-accel-buffering": "no",
  });
  res.flushHeaders();
}

export function event(res: Response, name: string, data: unknown) {
  if (!res.destroyed && !res.writableEnded)
    res.write(`event: ${name}\ndata: ${JSON.stringify(data)}\n\n`);
}
