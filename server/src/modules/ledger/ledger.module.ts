import { Module } from '@nestjs/common';
import { LedgerController } from './ledger.controller.js';
import { ClerkAuthGuard } from '../../common/guards/clerk-auth.guard.js';

@Module({
  controllers: [LedgerController],
  providers: [ClerkAuthGuard],
})
export class LedgerModule {}
