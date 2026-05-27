// libs/shared/src/context/index.ts

export interface RequestContext {
  traceId: string;
  userId: number;
  tenantId: number;
  roleCodes: string[];
  ip: string;
  userAgent: string;
  now: Date;
  locale: string;
}

export interface TenantContext {
  tenantId: number;
  isSystemScope: boolean;
  systemScopeReason?: string;
}

export function createRequestContext(data: Partial<RequestContext>): RequestContext {
  return {
    traceId: data.traceId || '',
    userId: data.userId || 0,
    tenantId: data.tenantId || 0,
    roleCodes: data.roleCodes || [],
    ip: data.ip || '',
    userAgent: data.userAgent || '',
    now: data.now || new Date(),
    locale: data.locale || 'zh-CN',
  };
}

export { TraceInterceptor } from './trace.interceptor';
export { ResponseTransformInterceptor } from './response-transform.interceptor';
