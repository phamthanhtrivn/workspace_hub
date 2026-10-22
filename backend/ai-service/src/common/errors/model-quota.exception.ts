import { TooManyRequestsException } from "./rate-limit.exception";

// Raised only before a provider request is sent; waiting cannot replay a model call.
export class ModelMinuteQuotaException extends TooManyRequestsException {
  constructor() {
    super("AI đang chờ hạn mức theo phút. Vui lòng thử lại sau.");
  }
}
