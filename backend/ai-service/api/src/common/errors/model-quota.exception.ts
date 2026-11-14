import { TooManyRequestsException } from "./rate-limit.exception";
import { BadRequestException } from "@nestjs/common";

// Raised only before a provider request is sent; waiting cannot replay a model call.
export class ModelMinuteQuotaException extends TooManyRequestsException {
  constructor(readonly retryAfterMs = 2000) {
    super({
      message: "AI đang chờ hạn mức theo phút. Vui lòng thử lại sau.",
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
        ? "VISION_DAILY_QUOTA: Hết ngân sách đọc hình hôm nay. Hạn mức đặt lại lúc 07:00 giờ Việt Nam."
        : "MODEL_DAILY_QUOTA: Hết hạn mức AI hôm nay. Hạn mức đặt lại lúc 07:00 giờ Việt Nam.",
      code: vision ? "VISION_DAILY_QUOTA" : "MODEL_DAILY_QUOTA",
      retryAfterMs,
    });
  }
}

export class ModelInputBudgetException extends BadRequestException {
  constructor() {
    super({
      message:
        "MODEL_INPUT_BUDGET: Nội dung yêu cầu vượt ngân sách token. Hãy giảm nội dung hoặc chia nhỏ yêu cầu.",
      code: "MODEL_INPUT_BUDGET",
    });
  }
}
