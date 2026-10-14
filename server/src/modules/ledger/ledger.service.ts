import { Injectable, BadRequestException } from '@nestjs/common';
import { JournalEntry } from '../../domain/ledger/journal-entry.js';
import { Money } from '../../domain/value-objects/money.js';
import { LedgerDirection, SupportedCurrency } from '../../shared/index.js';
import { loadPersistedMap, savePersistedMap } from '../../common/persistence.js';

export interface StoredJournalEntry {
  id: string;
  orgId: string;
  description: string;
  sourceType: string;
  sourceId?: string;
  debitAccount: string;
  creditAccount: string;
  amountMinor: number;
  currency: string;
  postedAt: string;
}

export interface PostJournalEntryDto {
  orgId: string;
  description: string;
  sourceType: string;
  sourceId?: string;
  debitAccount: string;
  creditAccount: string;
  amountMinor: number;
  currency?: string;
}

@Injectable()
export class LedgerService {
  // Tenant-isolated disk-backed persistent store: Map<orgId, StoredJournalEntry[]>
  private readonly orgEntries = loadPersistedMap<StoredJournalEntry>('ledger_entries.json');
  private entryCounter = 1000;

  constructor() {
    // Restore entryCounter to max existing ID
    for (const entries of this.orgEntries.values()) {
      for (const e of entries) {
        const match = e.id.match(/\d+/);
        if (match) {
          const num = parseInt(match[0], 10);
          if (num > this.entryCounter) this.entryCounter = num;
        }
      }
    }
  }

  /**
   * Initialize organization ledger with healthy baseline treasury allocation
   */
  private ensureOrgSeeded(orgId: string) {
    if (!this.orgEntries.has(orgId)) {
      const now = new Date().toISOString().split('T')[0];
      const baseline: StoredJournalEntry = {
        id: `#JE-${++this.entryCounter}`,
        orgId,
        description: 'Initial Treasury Capital Allocation',
        sourceType: 'DEPOSIT',
        sourceId: `seed_treasury_${orgId}`,
        debitAccount: 'KORA_WALLET',
        creditAccount: 'EQUITY',
        amountMinor: 5000000000, // ₦50,000,000.00 / $500,000.00 treasury liquidity
        currency: 'NGN',
        postedAt: now,
      };
      this.orgEntries.set(orgId, [baseline]);
      savePersistedMap('ledger_entries.json', this.orgEntries);
    }
  }

  getEntries(orgId: string): StoredJournalEntry[] {
    this.ensureOrgSeeded(orgId);
    return this.orgEntries.get(orgId) || [];
  }

  postJournalEntry(dto: PostJournalEntryDto): StoredJournalEntry {
    if (!dto.amountMinor || dto.amountMinor <= 0) {
      throw new BadRequestException('Transaction amount must be strictly greater than zero');
    }

    const currency = (dto.currency || 'NGN') as SupportedCurrency;

    // Validate with domain engine to enforce double-entry equality
    const entryId = `je_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    new JournalEntry({
      id: entryId,
      orgId: dto.orgId,
      postedAt: new Date(),
      description: dto.description,
      sourceType: dto.sourceType,
      sourceId: dto.sourceId || `src_${Date.now()}`,
      idempotencyKey: `idem_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      currency,
      lines: [
        {
          accountId: dto.debitAccount,
          direction: LedgerDirection.DEBIT,
          money: Money.fromMinor(dto.amountMinor, currency),
        },
        {
          accountId: dto.creditAccount,
          direction: LedgerDirection.CREDIT,
          money: Money.fromMinor(dto.amountMinor, currency),
        },
      ],
    });

    this.ensureOrgSeeded(dto.orgId);
    const existing = this.orgEntries.get(dto.orgId) || [];

    const stored: StoredJournalEntry = {
      id: `#JE-${++this.entryCounter}`,
      orgId: dto.orgId,
      description: dto.description,
      sourceType: dto.sourceType,
      sourceId: dto.sourceId,
      debitAccount: dto.debitAccount,
      creditAccount: dto.creditAccount,
      amountMinor: dto.amountMinor,
      currency,
      postedAt: new Date().toISOString().split('T')[0],
    };

    existing.unshift(stored);
    this.orgEntries.set(dto.orgId, existing);
    savePersistedMap('ledger_entries.json', this.orgEntries);

    console.log(`[LedgerService] Posted #${stored.id} for ${dto.orgId}: ${dto.description} (${dto.amountMinor} minor)`);
    return stored;
  }

  getAccounts(orgId: string) {
    this.ensureOrgSeeded(orgId);
    const entries = this.orgEntries.get(orgId) || [];

    const walletBalance = entries.reduce((acc, curr) => {
      if (curr.debitAccount === 'KORA_WALLET') return acc + curr.amountMinor;
      if (curr.creditAccount === 'KORA_WALLET') return acc - curr.amountMinor;
      return acc;
    }, 0);

    const billingIncome = entries.reduce((acc, curr) => {
      if (curr.creditAccount === 'BILLING_INCOME') return acc + curr.amountMinor;
      return acc;
    }, 0);

    const payrollExpense = entries.reduce((acc, curr) => {
      if (curr.debitAccount === 'PAYROLL_EXPENSE') return acc + curr.amountMinor;
      return acc;
    }, 0);

    return [
      { code: 'KORA_WALLET', name: 'Kora Settlement Asset', balanceMinor: walletBalance, currency: 'NGN' },
      { code: 'PAYROLL_EXPENSE', name: 'Operating Payroll Expense', balanceMinor: payrollExpense, currency: 'NGN' },
      { code: 'BILLING_INCOME', name: 'Accounts Receivable Income', balanceMinor: billingIncome, currency: 'NGN' },
    ];
  }
}
