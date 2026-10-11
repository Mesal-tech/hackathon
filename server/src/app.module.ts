import { Module } from '@nestjs/common';
import { HealthModule } from './modules/health/health.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { LedgerModule } from './modules/ledger/ledger.module.js';
import { PayrollModule } from './modules/payroll/payroll.module.js';
import { BillingModule } from './modules/billing/billing.module.js';

@Module({
  imports: [
    HealthModule,
    AuthModule,
    LedgerModule,
    PayrollModule,
    BillingModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
