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
    let code: string | undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse() as
        string | Record<string, unknown>;
      if (
        status === HttpStatus.CONFLICT &&
        typeof exceptionResponse === 'object' &&
        exceptionResponse.code === 'DOCUMENT_NAME_CONFLICT'
      )
        code = 'DOCUMENT_NAME_CONFLICT';

      if (
        status === HttpStatus.BAD_REQUEST &&
        typeof exceptionResponse === 'object' &&
        exceptionResponse.errors
      ) {
        message = 'Validation failed';
        errors = exceptionResponse.errors;
      } else if (
        status === HttpStatus.BAD_REQUEST &&
        typeof exceptionResponse === 'object' &&
        Array.isArray(exceptionResponse.message)
      ) {
        message = 'Validation failed';
        errors = Object.fromEntries(
          exceptionResponse.message
            .filter((msg): msg is string => typeof msg === 'string')
            .map((msg) => [msg.split(' ')[0], msg]),
        );
      } else {
        message =
          typeof exceptionResponse === 'string'
            ? exceptionResponse
            : typeof exceptionResponse.message === 'string'
              ? exceptionResponse.message
              : exception.message;
      }
    }

    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      message = 'Internal server error';
      errors = null;
      code = undefined;
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
