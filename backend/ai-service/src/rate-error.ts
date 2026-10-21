import { HttpException } from "@nestjs/common";
export class TooManyRequestsException extends HttpException {
  constructor(message: string) {
    super(message, 429);
  }
}
