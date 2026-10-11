import { Module } from '@nestjs/common';
import { BillingController } from './billing.controller.js';
import { ClerkAuthGuard } from '../../common/guards/clerk-auth.guard.js';

@Module({
  controllers: [BillingController],
  providers: [ClerkAuthGuard],
})
export class BillingModule {}
