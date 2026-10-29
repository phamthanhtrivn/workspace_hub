import type { Response } from "express";

export function event(res: Response, name: string, data: unknown) {
  if (!res.destroyed && !res.writableEnded)
    res.write(`event: ${name}\ndata: ${JSON.stringify(data)}\n\n`);
}
