import { AI_UI_MESSAGES } from "../ai-ui.messages";
import { TooManyRequestsException } from "./rate-limit.exception";
import { BadRequestException } from "@nestjs/common";

// Raised only before a provider request is sent; waiting cannot replay a model call.
export class ModelMinuteQuotaException extends TooManyRequestsException {
  constructor(readonly retryAfterMs = 2000) {
    super({
      message: AI_UI_MESSAGES.MINUTE_QUOTA,
      code: "MODEL_MINUTE_QUOTA",
      retryAfterMs,
    });
  }
}

export class ModelDailyQuotaException extends TooManyRequestsException {
  constructor(
    readonly retryAfterMs: number,
    vision = false,
  ) {
    super({
      message: vision
        ? AI_UI_MESSAGES.VISION_DAILY_QUOTA
        : AI_UI_MESSAGES.MODEL_DAILY_QUOTA,
      code: vision ? "VISION_DAILY_QUOTA" : "MODEL_DAILY_QUOTA",
      retryAfterMs,
    });
  }
}

export class ModelInputBudgetException extends BadRequestException {
  constructor() {
    super({
      message:
        AI_UI_MESSAGES.MODEL_INPUT_BUDGET,
      code: "MODEL_INPUT_BUDGET",
    });
  }
}
