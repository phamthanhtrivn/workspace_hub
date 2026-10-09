import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let errors: unknown = null;
    let code: string | undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse() as
        string | Record<string, unknown>;
      if (
        typeof exceptionResponse === 'object' &&
        typeof exceptionResponse.code === 'string'
      )
        code = exceptionResponse.code;

      // If it comes from our custom ValidationPipe exceptionFactory
      if (
        status === HttpStatus.BAD_REQUEST &&
        typeof exceptionResponse === 'object' &&
        exceptionResponse.errors
      ) {
        message = 'Validation failed';
        errors = exceptionResponse.errors;
      }
      // Fallback for default NestJS ValidationPipe behavior
      else if (
        status === HttpStatus.BAD_REQUEST &&
        typeof exceptionResponse === 'object' &&
        Array.isArray(exceptionResponse.message)
      ) {
        message = 'Validation failed';
        errors = {};
        const fieldErrors: Record<string, string> = {};
        exceptionResponse.message
          .filter((msg): msg is string => typeof msg === 'string')
          .forEach((msg) => {
            const field = msg.split(' ')[0]; // simple heuristic
            fieldErrors[field] = msg;
          });
        errors = fieldErrors;
      } else {
        message =
          typeof exceptionResponse === 'string'
            ? exceptionResponse
            : typeof exceptionResponse.message === 'string'
              ? exceptionResponse.message
              : exception.message;
      }
    } else if (exception instanceof Error) {
      message = exception.message;
    }

    if (!(exception instanceof HttpException)) {
      this.logger.error(
        message,
        exception instanceof Error ? exception.stack : undefined,
      );
    }

    response.status(status).json({
      success: false,
      message: message,
      data: null,
      errors: errors,
      ...(code ? { code } : {}),
      timestamp: new Date().toISOString(),
    });
  }
}
