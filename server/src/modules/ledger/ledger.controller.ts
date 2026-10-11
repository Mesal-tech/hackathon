import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { ClerkAuthGuard } from '../../common/guards/clerk-auth.guard.js';
import { CurrentUser, ClerkUserContext } from '../../common/decorators/current-user.decorator.js';
import { JournalEntry } from '../../domain/ledger/journal-entry.js';
import { Money } from '../../domain/value-objects/money.js';
import { LedgerDirection, SupportedCurrency } from '../../shared/index.js';

interface CreateEntryDto {
  description: string;
  sourceType: string;
  sourceId?: string;
  currency?: SupportedCurrency;
  lines: Array<{
    accountId: string;
    direction: 'DEBIT' | 'CREDIT';
    amountMinor: number;
  }>;
}

// In-memory tenant store for double-entry records
const inMemoryLedgerEntries: Array<{
  id: string;
  orgId: string;
  description: string;
  sourceType: string;
  debitAccount: string;
  creditAccount: string;
  amountMinor: number;
  postedAt: string;
}> = [];

@Controller('ledger')
@UseGuards(ClerkAuthGuard)
export class LedgerController {
  @Get('entries')
  getEntries(@CurrentUser() user: ClerkUserContext) {
    const orgId = user?.orgId || user?.userId || 'default-org';
    const entries = inMemoryLedgerEntries.filter((e) => e.orgId === orgId);
    return {
      entries,
      totalCount: entries.length,
      orgId,
    };
  }

  @Post('entries')
  createEntry(
    @CurrentUser() user: ClerkUserContext,
    @Body() dto: CreateEntryDto
  ) {
    const orgId = user?.orgId || user?.userId || 'default-org';

    if (!dto.lines || dto.lines.length < 2) {
      throw new BadRequestException('A double-entry journal entry must have at least 2 lines (debit and credit)');
    }

    try {
      // Validate with domain engine
      const currency = dto.currency || 'NGN';
      const domainLines = dto.lines.map((l) => ({
        accountId: l.accountId,
        direction: l.direction === 'DEBIT' ? LedgerDirection.DEBIT : LedgerDirection.CREDIT,
        money: Money.fromMinor(l.amountMinor, currency),
      }));

      const entryId = `je_${Date.now()}`;
      new JournalEntry({
        id: entryId,
        orgId,
        postedAt: new Date(),
        description: dto.description || 'Manual Journal Entry',
        sourceType: dto.sourceType || 'MANUAL',
        sourceId: dto.sourceId || `src_${Date.now()}`,
        idempotencyKey: `idem_${Date.now()}`,
        currency,
        lines: domainLines,
      });

      const debitLine = dto.lines.find((l) => l.direction === 'DEBIT')!;
      const creditLine = dto.lines.find((l) => l.direction === 'CREDIT')!;

      const storedEntry = {
        id: `#JE-${1000 + inMemoryLedgerEntries.length + 1}`,
        orgId,
        description: dto.description,
        sourceType: dto.sourceType,
        debitAccount: debitLine.accountId,
        creditAccount: creditLine.accountId,
        amountMinor: debitLine.amountMinor,
        postedAt: new Date().toISOString().split('T')[0],
      };

      inMemoryLedgerEntries.unshift(storedEntry);

      return {
        success: true,
        entry: storedEntry,
      };
    } catch (err: any) {
      throw new BadRequestException(`Ledger invariant check failed: ${err.message}`);
    }
  }

  @Get('accounts')
  getAccounts(@CurrentUser() user: ClerkUserContext) {
    const orgId = user?.orgId || user?.userId || 'default-org';
    const entries = inMemoryLedgerEntries.filter((e) => e.orgId === orgId);

    const balanceMinor = entries.reduce((acc, curr) => {
      if (curr.debitAccount === 'KORA_WALLET') return acc + curr.amountMinor;
      if (curr.creditAccount === 'KORA_WALLET') return acc - curr.amountMinor;
      return acc;
    }, 0);

    return {
      accounts: [
        { code: 'KORA_WALLET', name: 'Kora Settlement Asset', balanceMinor, currency: 'NGN' },
        { code: 'PAYROLL_EXPENSE', name: 'Operating Payroll Expense', balanceMinor: 0, currency: 'NGN' },
        { code: 'BILLING_INCOME', name: 'Accounts Receivable Income', balanceMinor: 0, currency: 'NGN' },
      ],
    };
  }
}
