import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let errors: unknown = null;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse() as string | Record<string, unknown>;

      // If it comes from our custom ValidationPipe exceptionFactory
      if (status === HttpStatus.BAD_REQUEST && typeof exceptionResponse === 'object' && exceptionResponse.errors) {
        message = 'Validation failed';
        errors = exceptionResponse.errors;
      }
      // Fallback for default NestJS ValidationPipe behavior
      else if (status === HttpStatus.BAD_REQUEST && typeof exceptionResponse === 'object' && Array.isArray(exceptionResponse.message)) {
        message = 'Validation failed';
        errors = Object.fromEntries(exceptionResponse.message.filter((msg): msg is string => typeof msg === 'string').map(msg => [msg.split(' ')[0], msg]));
      }
      else {
        message = typeof exceptionResponse === 'string'
            ? exceptionResponse
            : typeof exceptionResponse.message === 'string' ? exceptionResponse.message : exception.message;
      }
    }

    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      message = 'Internal server error';
      errors = null;
    }

    response.status(status).json({
      success: false,
      message: message,
      data: null,
      errors: errors,
      timestamp: new Date().toISOString(),
    });
  }
}
