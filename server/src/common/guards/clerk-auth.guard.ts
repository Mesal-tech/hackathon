import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { verifyToken } from '@clerk/backend';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator.js';
import { ClerkUserContext } from '../decorators/current-user.decorator.js';

@Injectable()
export class ClerkAuthGuard implements CanActivate {
  private readonly logger = new Logger(ClerkAuthGuard.name);

  constructor(private readonly reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Authorization header is missing or malformed (expected: Bearer <token>)');
    }

    const token = authHeader.split(' ')[1]?.trim();
    if (!token) {
      throw new UnauthorizedException('Authentication token is required');
    }

    const secretKey = process.env.CLERK_SECRET_KEY;

    if (secretKey) {
      try {
        const payload = await verifyToken(token, { secretKey });
        const userContext: ClerkUserContext = {
          userId: payload.sub,
          orgId: (payload as any).org_id || request.headers['x-org-id'],
          orgRole: (payload as any).org_role,
          orgSlug: (payload as any).org_slug,
          claims: payload as unknown as Record<string, unknown>,
        };

        request.user = userContext;
        if (userContext.orgId) {
          request.orgId = userContext.orgId;
        }

        return true;
      } catch (err: any) {
        this.logger.warn(`Clerk token verification failed: ${err.message}`);
        throw new UnauthorizedException(`Invalid or expired Clerk token: ${err.message}`);
      }
    } else {
      // Development mode without CLERK_SECRET_KEY configured yet
      this.logger.warn('CLERK_SECRET_KEY not set. Falling back to JWT payload decoding in development.');
      try {
        const parts = token.split('.');
        if (parts.length === 3) {
          const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
          request.user = {
            userId: payload.sub || 'dev-user-001',
            orgId: payload.org_id || request.headers['x-org-id'] || 'dev-org-001',
            orgRole: payload.org_role || 'org:admin',
            claims: payload,
          };
          request.orgId = request.user.orgId;
          return true;
        }
      } catch {
        // Fall through to error
      }

      // If token is a test/demo bearer token
      if (token.startsWith('clerk_') || token.startsWith('test_')) {
        request.user = {
          userId: `user_${token}`,
          orgId: request.headers['x-org-id'] || 'org_antigravity_enterprise',
          orgRole: 'org:admin',
        };
        request.orgId = request.user.orgId;
        return true;
      }

      throw new UnauthorizedException('Invalid authentication token format');
    }
  }
}
