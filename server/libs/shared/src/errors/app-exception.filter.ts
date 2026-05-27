// libs/shared/src/errors/app-exception.filter.ts

import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { FastifyReply, FastifyRequest } from 'fastify';
import { AppException, ErrorCode } from './index';

@Catch()
export class AppExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<FastifyReply>();
    const request = ctx.getRequest<FastifyRequest>();

    let code = ErrorCode.INTERNAL_ERROR;
    let message = '服务异常';
    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    let traceId = (request as any).traceId || '';

    if (exception instanceof AppException) {
      code = exception.code;
      message = exception.message;
      statusCode = exception.statusCode;
    } else if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        message = (exceptionResponse as any).message || exception.message;
      } else {
        message = exception.message;
      }

      if (statusCode === HttpStatus.BAD_REQUEST) {
        code = ErrorCode.PARAM_ERROR;
      } else if (statusCode === HttpStatus.UNAUTHORIZED) {
        code = ErrorCode.UNAUTHORIZED;
      } else if (statusCode === HttpStatus.FORBIDDEN) {
        code = ErrorCode.FORBIDDEN;
      } else if (statusCode === HttpStatus.NOT_FOUND) {
        code = ErrorCode.NOT_FOUND;
      } else if (statusCode === HttpStatus.CONFLICT) {
        code = ErrorCode.CONFLICT;
      } else if (statusCode === HttpStatus.TOO_MANY_REQUESTS) {
        code = ErrorCode.RATE_LIMITED;
      }
    } else if (exception instanceof Error) {
      message = process.env.NODE_ENV === 'development' ? exception.message : '服务异常';
    }

    response.status(statusCode).send({
      code,
      msg: Array.isArray(message) ? message[0] : message,
      data: null,
      trace_id: traceId,
    });
  }
}
