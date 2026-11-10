"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ModelMinuteQuotaException = void 0;
const rate_limit_exception_1 = require("./rate-limit.exception");
// Raised only before a provider request is sent; waiting cannot replay a model call.
class ModelMinuteQuotaException extends rate_limit_exception_1.TooManyRequestsException {
    retryAfterMs;
    constructor(retryAfterMs = 2000) {
        super("AI đang chờ hạn mức theo phút. Vui lòng thử lại sau.");
        this.retryAfterMs = retryAfterMs;
    }
}
exports.ModelMinuteQuotaException = ModelMinuteQuotaException;
