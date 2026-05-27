// libs/shared/src/result/index.ts

export class Result<T> {
  private constructor(
    public readonly success: boolean,
    public readonly data?: T,
    public readonly error?: string,
  ) {}

  static ok<T>(data?: T): Result<T> {
    return new Result<T>(true, data);
  }

  static fail<T>(error: string): Result<T> {
    return new Result<T>(false, undefined, error);
  }

  unwrap(): T {
    if (!this.success || this.data === undefined) {
      throw new Error(this.error || 'Result has no data');
    }
    return this.data;
  }

  unwrapOr(defaultValue: T): T {
    return this.success && this.data !== undefined ? this.data : defaultValue;
  }
}

export interface PaginatedResult<T> {
  list: T[];
  total: number;
  cursor?: string;
  hasMore: boolean;
}

export interface ApiResponse<T = any> {
  code: number;
  msg: string;
  data: T;
  trace_id?: string;
}
