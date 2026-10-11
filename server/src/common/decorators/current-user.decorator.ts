import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface ClerkUserContext {
  userId: string;
  orgId?: string;
  orgRole?: string;
  orgSlug?: string;
  email?: string;
  claims?: Record<string, unknown>;
}

export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): ClerkUserContext | undefined => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  }
);
