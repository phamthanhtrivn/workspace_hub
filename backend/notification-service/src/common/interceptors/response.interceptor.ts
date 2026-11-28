import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from "@nestjs/common";
import { Observable } from "rxjs";
import { map } from "rxjs/operators";

export interface Response<T> {
  success: boolean;
  message: string;
  data: T;
  pagination?: unknown;
  errors: unknown;
  timestamp: string;
}

@Injectable()
export class ResponseInterceptor implements NestInterceptor<unknown, Response<unknown>> {
  intercept(
    context: ExecutionContext,
    next: CallHandler<unknown>,
  ): Observable<Response<unknown>> {
    return next.handle().pipe(
      map((res) => {
        // If the response is already in the ApiResponse format, return it directly
        if (
          res &&
          typeof res === "object" &&
          "success" in res &&
          "timestamp" in res
        ) {
          return res as Response<unknown>;
        }

        let message = "Success";
        let data = res;
        let pagination: unknown;

        // If the controller returned an object with message and data
        if (
          res &&
          typeof res === "object" &&
          "message" in res &&
          "data" in res
        ) {
          if (typeof res.message === "string") message = res.message;
          data = res.data;
          if ("pagination" in res) {
            pagination = res.pagination;
          }
        }

        const responseObj: Response<unknown> = {
          success: true,
          message: message,
          data: data,
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
