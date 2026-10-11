import { Module } from '@nestjs/common';
import { PayrollController } from './payroll.controller.js';
import { ClerkAuthGuard } from '../../common/guards/clerk-auth.guard.js';

@Module({
  controllers: [PayrollController],
  providers: [ClerkAuthGuard],
})
export class PayrollModule {}
