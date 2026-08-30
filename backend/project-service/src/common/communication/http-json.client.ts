import { Injectable } from "@nestjs/common";
import { RuntimeConfigService } from "../config/runtime-config.service";

export class ServiceHttpError extends Error {
  constructor(
    readonly service: string,
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = ServiceHttpError.name;
  }
}

interface JsonRequest {
  service: string;
  url: string;
  method?: "GET" | "POST" | "PATCH";
  headers?: Record<string, string>;
  body?: unknown;
}

@Injectable()
export class HttpJsonClient {
  constructor(private readonly config: RuntimeConfigService) {}

  async request<T = void>(request: JsonRequest): Promise<T> {
    let response: Response;
    try {
      response = await fetch(request.url, {
        method: request.method ?? "GET",
        headers: {
          accept: "application/json",
          ...(request.body === undefined
            ? {}
            : { "content-type": "application/json" }),
          ...request.headers,
        },
        body:
          request.body === undefined ? undefined : JSON.stringify(request.body),
        signal: AbortSignal.timeout(this.config.httpTimeoutMs),
      });
    } catch (error) {
      const reason =
        error instanceof Error ? error.message : "unknown network error";
      throw new ServiceHttpError(
        request.service,
        `${request.service} request failed: ${reason}`,
      );
    }

    if (!response.ok) {
      throw new ServiceHttpError(
        request.service,
        `${request.service} returned HTTP ${response.status}`,
        response.status,
      );
    }

    if (response.status === 204) return undefined as T;
    const contentType = response.headers.get("content-type");
    if (!contentType?.includes("application/json")) return undefined as T;
    return response.json() as Promise<T>;
  }
}
