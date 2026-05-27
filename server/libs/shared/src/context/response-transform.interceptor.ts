// libs/shared/src/context/response-transform.interceptor.ts

import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface ApiResponse<T> {
  code: number;
  msg: string;
  data: T;
  trace_id?: string;
}

@Injectable()
export class ResponseTransformInterceptor<T> implements NestInterceptor<T, ApiResponse<T>> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<ApiResponse<T>> {
    const request = context.switchToHttp().getRequest();
    const traceId = request.traceId || '';

    return next.handle().pipe(
      map((data) => ({
        code: 0,
        msg: 'ok',
        data,
        trace_id: traceId,
      })),
    );
  }
}
