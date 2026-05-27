// libs/shared/src/errors/index.ts

export enum ErrorCode {
  // 通用
  SUCCESS = 0,
  PARAM_ERROR = 40001,
  UNAUTHORIZED = 40101,
  FORBIDDEN = 40301,
  NOT_FOUND = 40401,
  CONFLICT = 40901,
  RATE_LIMITED = 42901,
  INTERNAL_ERROR = 50001,
  DOWNSTREAM_ERROR = 50301,

  // 业务错误
  OUT_OF_SEATS = 43001,
  INSUFFICIENT_BALANCE = 43002,
  ALREADY_REGISTERED = 43003,
  ACTIVITY_NOT_OPEN = 40902,
  NOT_TENANT_MEMBER = 40302,
  CROSS_TENANT_ACCESS = 40303,
  NOT_OWNER = 40304,
}

export class AppException extends Error {
  constructor(
    public readonly code: ErrorCode,
    message: string,
    public readonly statusCode: number = 200,
  ) {
    super(message);
    this.name = 'AppException';
  }
}

export class ParamError extends AppException {
  constructor(message: string) {
    super(ErrorCode.PARAM_ERROR, message, 400);
  }
}

export class UnauthorizedError extends AppException {
  constructor(message = '未登录') {
    super(ErrorCode.UNAUTHORIZED, message, 401);
  }
}

export class ForbiddenError extends AppException {
  constructor(message = '无权限') {
    super(ErrorCode.FORBIDDEN, message, 403);
  }
}

export class NotFoundError extends AppException {
  constructor(message = '资源不存在') {
    super(ErrorCode.NOT_FOUND, message, 404);
  }
}

export class ConflictError extends AppException {
  constructor(message: string) {
    super(ErrorCode.CONFLICT, message, 409);
  }
}

export class RateLimitError extends AppException {
  constructor(message = '请求过于频繁') {
    super(ErrorCode.RATE_LIMITED, message, 429);
  }
}

export class OutOfSeatsError extends AppException {
  constructor() {
    super(ErrorCode.OUT_OF_SEATS, '席位不足', 409);
  }
}

export class InsufficientBalanceError extends AppException {
  constructor() {
    super(ErrorCode.INSUFFICIENT_BALANCE, '余额不足', 409);
  }
}

export class AlreadyRegisteredError extends AppException {
  constructor() {
    super(ErrorCode.ALREADY_REGISTERED, '已报名', 409);
  }
}

export { AppExceptionFilter } from './app-exception.filter';
