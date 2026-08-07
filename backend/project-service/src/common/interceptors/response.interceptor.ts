import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface Response<T> {
  success: boolean;
  message: string;
  data: T;
  pagination?: unknown;
  errors: unknown;
  timestamp: string;
}

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, Response<T>> {
  intercept(
    _context: ExecutionContext,
    next: CallHandler,
  ): Observable<Response<T>> {
    return next.handle().pipe(
      map((res) => {
        if (
          res &&
          typeof res === 'object' &&
          'success' in res &&
          'timestamp' in res
        ) {
          return res as Response<T>;
        }

        let message = 'Success';
        let data = res;
        let pagination: unknown;

        if (
          res &&
          typeof res === 'object' &&
          'message' in res &&
          'data' in res
        ) {
          const response = res as { message: string; data: T; pagination?: unknown };
          message = response.message;
          data = response.data;
          pagination = response.pagination;
        }

        return {
          success: true,
          message,
          data,
          errors: null,
          timestamp: new Date().toISOString(),
          ...(pagination !== undefined ? { pagination } : {}),
        };
      }),
    );
  }
}
