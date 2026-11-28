import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object';
}

@Injectable()
export class ResponseInterceptor implements NestInterceptor<unknown, unknown> {
  intercept(
    _context: ExecutionContext,
    next: CallHandler<unknown>,
  ): Observable<unknown> {
    return next.handle().pipe(
      map((res) => {
        if (isRecord(res) && 'success' in res && 'timestamp' in res) {
          return res;
        }

        let message: unknown = 'Success';
        let data: unknown = res;
        let pagination: unknown;

        if (isRecord(res) && 'message' in res && 'data' in res) {
          message = res.message;
          data = res.data;
          if ('pagination' in res) {
            pagination = res.pagination;
          }
        }

        const responseObj = {
          success: true,
          message,
          data,
          errors: null,
          timestamp: new Date().toISOString(),
        };

        return pagination ? { ...responseObj, pagination } : responseObj;
      }),
    );
  }
}
