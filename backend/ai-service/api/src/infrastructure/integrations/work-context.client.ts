import { AI_UI_MESSAGES } from "../../common/ai-ui.messages";
import {
  ForbiddenException,
  ServiceUnavailableException,
} from "@nestjs/common";
import { config } from "../../config/env.config";
import { readResponseText } from "../../common/read-response";
import { internalPost, serviceUrl } from "./internal-http";

export async function workContextRequest(
  service: "project" | "calendar",
  path: string,
  body: object,
  signal?: AbortSignal,
) {
  const serviceKey =
    service === "project"
      ? config.AI_TO_PROJECT_KEY
      : config.AI_TO_CALENDAR_KEY;
  if (serviceKey.length < 32)
    throw new ServiceUnavailableException(
      AI_UI_MESSAGES.WORK_ASSISTANT_UNCONFIGURED,
    );
  const base =
    service === "project"
      ? config.WORK_ASSISTANT_PROJECT_URL
      : config.WORK_ASSISTANT_CALENDAR_URL;
  const response = await internalPost(
    serviceUrl(base, "/internal/work-assistant/" + path),
    { key: serviceKey, body, signal, timeoutMs: 10000 },
  );
  if (response.status === 403 || response.status === 404) {
    await response.body?.cancel();
    throw new ForbiddenException(AI_UI_MESSAGES.PROJECT_FORBIDDEN);
  }
  if (!response.ok) {
    await response.body?.cancel();
    throw new ServiceUnavailableException(AI_UI_MESSAGES.DATA_UNAVAILABLE);
  }
  const text = await readResponseText(response, 350000);

  return (JSON.parse(text) as { data: unknown }).data;
}
