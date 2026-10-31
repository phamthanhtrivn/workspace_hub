import { Injectable } from "@nestjs/common";
import type { Response } from "express";
import { event, startEventStream } from "./sse";

export interface ApplicationEventStream {
  readonly destroyed: boolean;
  start(): void;
  emit(name: string, payload: unknown): void;
  heartbeat(): void;
  onClose(listener: () => void): () => void;
  end(): void;
}

@Injectable()
export class SseTransport {
  create(response: Response): ApplicationEventStream {
    return {
      get destroyed() {
        return response.destroyed;
      },
      start: () => startEventStream(response),
      emit: (name, payload) => event(response, name, payload),
      heartbeat: () => {
        if (!response.destroyed) response.write(": heartbeat\n\n");
      },
      onClose: (listener) => {
        response.once("close", listener);
        return () => {
          response.off("close", listener);
        };
      },
      end: () => {
        response.end();
      },
    };
  }
}
