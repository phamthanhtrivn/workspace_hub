/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return */
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface Response<T> {
  success: boolean;
  message: string;
  data: T;
  pagination?: any;
  errors: any;
  timestamp: string;
}

function serializeBigInt(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'bigint') {
    return Number(obj);
  }
  if (Array.isArray(obj)) {
    return obj.map(serializeBigInt);
  }
  if (typeof obj === 'object') {
    // If it's a Date object, return it as is to preserve formatting
    if (obj instanceof Date) {
      return obj;
    }
    const serialized: any = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        serialized[key] = serializeBigInt(obj[key]);
      }
    }
    return serialized;
  }
  return obj;
}

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, Response<T>> {
  intercept(
    context: ExecutionContext,
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
          return serializeBigInt(res);
        }

        let message = 'Success';
        let data = res;
        let pagination = undefined;

        if (
          res &&
          typeof res === 'object' &&
          'message' in res &&
          'data' in res
        ) {
          message = res.message;
          data = res.data;
          if ('pagination' in res) {
            pagination = res.pagination;
          }
        }

        const responseObj: any = {
          success: true,
          message: message,
          data: serializeBigInt(data),
          errors: null,
          timestamp: new Date().toISOString(),
        };

        if (pagination) {
          responseObj.pagination = serializeBigInt(pagination);
        }

        return responseObj;
      }),
    );
  }
}
