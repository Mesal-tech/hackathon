import { LedgerDirection, SupportedCurrency } from '../../shared/index.js';
import { Money } from '../value-objects/money.js';

export interface LedgerLineProps {
  id?: string;
  accountId: string;
  direction: LedgerDirection;
  money: Money;
}

export interface JournalEntryProps {
  id: string;
  orgId: string;
  postedAt: Date;
  description: string;
  sourceType: string;
  sourceId: string;
  idempotencyKey: string;
  currency: SupportedCurrency;
  lines: LedgerLineProps[];
  reversalOf?: string;
}

export class JournalEntry {
  readonly id: string;
  readonly orgId: string;
  readonly postedAt: Date;
  readonly description: string;
  readonly sourceType: string;
  readonly sourceId: string;
  readonly idempotencyKey: string;
  readonly currency: SupportedCurrency;
  readonly lines: readonly LedgerLineProps[];
  readonly reversalOf?: string;

  constructor(props: JournalEntryProps) {
    if (props.lines.length < 2) {
      throw new Error('A balanced journal entry must contain at least 2 lines.');
    }

    // Invariant: All lines must have positive amounts and identical currency
    for (const line of props.lines) {
      if (line.money.isNegative() || line.money.isZero()) {
        throw new Error(`Ledger line for account ${line.accountId} must have a strictly positive amount.`);
      }
      if (line.money.currency !== props.currency) {
        throw new Error(
          `Currency mismatch in journal line: expected ${props.currency}, got ${line.money.currency}`
        );
      }
    }

    // Invariant: Sum of debits must equal sum of credits
    const totalDebits = props.lines
      .filter((l) => l.direction === LedgerDirection.DEBIT)
      .reduce((sum, l) => sum + l.money.amountMinor, 0);

    const totalCredits = props.lines
      .filter((l) => l.direction === LedgerDirection.CREDIT)
      .reduce((sum, l) => sum + l.money.amountMinor, 0);

    if (totalDebits !== totalCredits) {
      throw new Error(
        `Journal entry is unbalanced: total debits (${totalDebits}) do not equal total credits (${totalCredits})`
      );
    }

    this.id = props.id;
    this.orgId = props.orgId;
    this.postedAt = props.postedAt;
    this.description = props.description;
    this.sourceType = props.sourceType;
    this.sourceId = props.sourceId;
    this.idempotencyKey = props.idempotencyKey;
    this.currency = props.currency;
    this.lines = Object.freeze([...props.lines]);
    this.reversalOf = props.reversalOf;
  }

  /**
   * Creates a balancing reversal entry.
   * Debits become Credits and Credits become Debits.
   */
  createReversal(reversalId: string, idempotencyKey: string, reason: string): JournalEntry {
    const reversedLines: LedgerLineProps[] = this.lines.map((line) => ({
      accountId: line.accountId,
      direction: line.direction === LedgerDirection.DEBIT ? LedgerDirection.CREDIT : LedgerDirection.DEBIT,
      money: line.money,
    }));

    return new JournalEntry({
      id: reversalId,
      orgId: this.orgId,
      postedAt: new Date(),
      description: `Reversal of entry ${this.id}: ${reason}`,
      sourceType: 'REVERSAL',
      sourceId: this.id,
      idempotencyKey,
      currency: this.currency,
      lines: reversedLines,
      reversalOf: this.id,
    });
  }
}
