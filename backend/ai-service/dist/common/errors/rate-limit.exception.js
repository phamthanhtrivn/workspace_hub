"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TooManyRequestsException = void 0;
const common_1 = require("@nestjs/common");
class TooManyRequestsException extends common_1.HttpException {
    constructor(message) {
        super(message, 429);
    }
}
exports.TooManyRequestsException = TooManyRequestsException;
