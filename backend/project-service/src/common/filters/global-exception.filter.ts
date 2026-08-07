import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const status = exception instanceof HttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    const payload = exception instanceof HttpException
      ? exception.getResponse()
      : { message: 'Internal server error' };

    const message = typeof payload === 'string'
      ? payload
      : typeof payload === 'object' && payload !== null && 'message' in payload
        ? payload.message
        : 'Internal server error';

    const errors = typeof payload === 'object' && payload !== null && 'message' in payload && Array.isArray(payload.message)
      ? payload.message
      : null;

    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(exception instanceof Error ? exception.stack : exception);
    }

    response.status(status).json({
      success: false,
      message: Array.isArray(message) ? 'Validation failed' : message,
      data: null,
      errors,
      timestamp: new Date().toISOString(),
    });
  }
}
