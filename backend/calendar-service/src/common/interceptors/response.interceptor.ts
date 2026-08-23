/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return */
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
  pagination?: any;
  errors: any;
  timestamp: string;
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
          return res;
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
          message,
          data,
          errors: null,
          timestamp: new Date().toISOString(),
        };

        if (pagination) {
          responseObj.pagination = pagination;
        }

        return responseObj;
      }),
    );
  }
}
