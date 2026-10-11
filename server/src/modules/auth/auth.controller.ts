import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { ClerkAuthGuard } from '../../common/guards/clerk-auth.guard.js';
import { CurrentUser, ClerkUserContext } from '../../common/decorators/current-user.decorator.js';
import { Public } from '../../common/decorators/public.decorator.js';

interface OnboardingDto {
  orgName: string;
  orgType: 'COMPANY' | 'SCHOOL' | 'HOSPITAL';
  country: string;
  baseCurrency: string;
  registrationNumber?: string;
  industry?: string;
  dualApprovalThreshold?: number;
}

const inMemoryOnboardingStore = new Map<string, OnboardingDto & { completedAt: string }>();

@Controller('auth')
export class AuthController {
  @Get('me')
  @UseGuards(ClerkAuthGuard)
  getMe(@CurrentUser() user: ClerkUserContext) {
    const orgId = user?.orgId || user?.userId || 'default';
    const onboarding = inMemoryOnboardingStore.get(orgId);

    return {
      authenticated: true,
      user,
      onboarding: onboarding || null,
      timestamp: new Date().toISOString(),
    };
  }

  @Post('onboarding')
  @UseGuards(ClerkAuthGuard)
  saveOnboarding(
    @CurrentUser() user: ClerkUserContext,
    @Body() dto: OnboardingDto
  ) {
    const orgId = user?.orgId || user?.userId || 'default';
    const record = {
      ...dto,
      completedAt: new Date().toISOString(),
    };
    inMemoryOnboardingStore.set(orgId, record);

    return {
      success: true,
      orgId,
      organization: record,
    };
  }

  @Get('config')
  @Public()
  getConfig() {
    const hasSecret = Boolean(process.env.CLERK_SECRET_KEY);
    const pubKey = process.env.CLERK_PUBLISHABLE_KEY || process.env.VITE_CLERK_PUBLISHABLE_KEY || '';

    return {
      provider: 'clerk',
      configured: hasSecret || Boolean(pubKey),
      publishableKey: pubKey,
      multiTenancyMode: 'rls-org-scoped',
    };
  }
}
