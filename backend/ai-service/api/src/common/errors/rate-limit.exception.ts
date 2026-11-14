import { HttpException } from "@nestjs/common";
export class TooManyRequestsException extends HttpException {
  constructor(
    message: string | { message: string; code: string; retryAfterMs: number },
  ) {
    super(message, 429);
  }
}
