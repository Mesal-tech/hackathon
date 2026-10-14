import { Global, Module } from '@nestjs/common';
import { LedgerController } from './ledger.controller.js';
import { LedgerService } from './ledger.service.js';
import { ClerkAuthGuard } from '../../common/guards/clerk-auth.guard.js';

@Global()
@Module({
  controllers: [LedgerController],
  providers: [LedgerService, ClerkAuthGuard],
  exports: [LedgerService],
})
export class LedgerModule {}
