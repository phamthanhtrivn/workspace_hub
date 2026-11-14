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
      "Trợ lý công việc chưa được cấu hình.",
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
    throw new ForbiddenException("Bạn không còn quyền xem dự án này.");
  }
  if (!response.ok) {
    await response.body?.cancel();
    throw new ServiceUnavailableException("Nguồn dữ liệu chưa truy cập được.");
  }
  const text = await readResponseText(response, 350000);

  return (JSON.parse(text) as { data: unknown }).data;
}
