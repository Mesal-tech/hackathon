import { Injectable, NestInterceptor, ExecutionContext, CallHandler, UnauthorizedException } from '@nestjs/common';
import { Observable } from 'rxjs';

@Injectable()
export class TenantContextInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    
    // Org ID can be extracted from JWT claims, session, or verified org header
    const orgId = request.headers['x-org-id'] || request.user?.orgId || request.user?.userId;

    // Public endpoints (e.g. /public/bills/:token, /webhooks/kora, /health/*, /auth/config) bypass org scope requirement
    const isPublic = request.url.includes('/public/') || 
                     request.url.includes('/webhooks/') || 
                     request.url.includes('/health/') ||
                     request.url.includes('/auth/config') ||
                     request.url.includes('/auth/status') ||
                     request.url.includes('/auth/login') ||
                     request.url.includes('/auth/register');

    if (!isPublic && !orgId) {
      throw new UnauthorizedException('Organization context (x-org-id or session org) is required for this operation');
    }

    // Attach orgId to request for DB transaction context (e.g. SET LOCAL app.org_id = '...')
    request.orgId = orgId;

    return next.handle();
  }
}
