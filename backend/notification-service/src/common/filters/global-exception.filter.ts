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
    let errors: any = null;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse: any = exception.getResponse();

      // If it comes from our custom ValidationPipe exceptionFactory
      if (status === HttpStatus.BAD_REQUEST && typeof exceptionResponse === 'object' && exceptionResponse.errors) {
        message = 'Validation failed';
        errors = exceptionResponse.errors;
      }
      // Fallback for default NestJS ValidationPipe behavior
      else if (status === HttpStatus.BAD_REQUEST && typeof exceptionResponse === 'object' && Array.isArray(exceptionResponse.message)) {
        message = 'Validation failed';
        errors = {};
        exceptionResponse.message.forEach((msg: string) => {
            const field = msg.split(' ')[0]; // simple heuristic
            errors[field] = msg;
        });
      }
      else {
        message = typeof exceptionResponse === 'string'
            ? exceptionResponse
            : exceptionResponse.message || exception.message;
      }
    } else if (exception instanceof Error) {
      message = exception.message;
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
