import {
  CanActivate,
  Injectable,
  ServiceUnavailableException,
} from "@nestjs/common";
import { config } from "../../config/env.config";

/** Rejects every work-assistant route unless the feature and both internal keys are configured. */
@Injectable()
export class WorkAssistantEnabledGuard implements CanActivate {
  canActivate() {
    if (
      config.WORK_ASSISTANT_ENABLED !== "true" ||
      config.AI_TO_PROJECT_KEY.length < 32 ||
      config.AI_TO_CALENDAR_KEY.length < 32
    )
      throw new ServiceUnavailableException(
        "Trợ lý công việc chưa được bật hoặc cấu hình.",
      );

    return true;
  }
}
