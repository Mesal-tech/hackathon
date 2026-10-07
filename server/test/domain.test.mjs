import test from 'node:test';
import assert from 'node:assert/strict';
import {
  Money,
  JournalEntry,
  BillStateMachine,
  PaymentStateMachine,
  PayrollRunStateMachine,
  PayoutStateMachine,
  CrossBorderStateMachine,
} from '../dist/domain/index.js';
import {
  LedgerDirection,
  BillStatus,
  PaymentStatus,
  PayrollRunStatus,
  PayoutStatus,
  CrossBorderStatus,
} from '../dist/shared/index.js';

test('Money Value Object enforces integer minor units and immutability', () => {
  const m1 = Money.fromMinor(250000, 'NGN'); // ₦2,500.00
  const m2 = Money.fromMinor(50000, 'NGN');  // ₦500.00

  assert.equal(m1.amountMinor, 250000);
  assert.equal(m1.currency, 'NGN');

  const sum = m1.add(m2);
  assert.equal(sum.amountMinor, 300000);
  assert.equal(sum.currency, 'NGN');

  // Verify immutability
  assert.equal(m1.amountMinor, 250000);

  // Allocation without losing minor units
  const portions = sum.allocate([1, 1, 1]);
  assert.equal(portions.length, 3);
  assert.equal(portions.reduce((acc, p) => acc + p.amountMinor, 0), 300000);
  assert.equal(portions[0].amountMinor, 100000);

  // Uneven allocation test (100 minor units split 3 ways: 34, 33, 33)
  const hundred = Money.fromMinor(100, 'NGN');
  const split = hundred.allocate([1, 1, 1]);
  assert.equal(split.reduce((acc, p) => acc + p.amountMinor, 0), 100);

  // Rejects floating point
  assert.throws(() => Money.fromMinor(10.5, 'NGN'), TypeError);
});

test('Double-entry JournalEntry enforces debits equal credits invariant', () => {
  const debitAmount = Money.fromMinor(1000000, 'NGN');
  const creditAmount = Money.fromMinor(1000000, 'NGN');

  const balancedEntry = new JournalEntry({
    id: 'entry-001',
    orgId: 'org-test-1',
    postedAt: new Date(),
    description: 'Initial funding',
    sourceType: 'DEPOSIT',
    sourceId: 'dep-1',
    idempotencyKey: 'idem-1',
    currency: 'NGN',
    lines: [
      { accountId: 'acc-kora-wallet', direction: LedgerDirection.DEBIT, money: debitAmount },
      { accountId: 'acc-receivables', direction: LedgerDirection.CREDIT, money: creditAmount },
    ],
  });

  assert.equal(balancedEntry.lines.length, 2);

  // Unbalanced entry throws error
  assert.throws(() => {
    new JournalEntry({
      id: 'entry-unbalanced',
      orgId: 'org-test-1',
      postedAt: new Date(),
      description: 'Unbalanced',
      sourceType: 'TEST',
      sourceId: 't-1',
      idempotencyKey: 'idem-2',
      currency: 'NGN',
      lines: [
        { accountId: 'acc-1', direction: LedgerDirection.DEBIT, money: Money.fromMinor(100000, 'NGN') },
        { accountId: 'acc-2', direction: LedgerDirection.CREDIT, money: Money.fromMinor(90000, 'NGN') },
      ],
    });
  }, /Journal entry is unbalanced/);

  // Reversal test
  const reversal = balancedEntry.createReversal('rev-001', 'idem-rev-1', 'Customer requested return');
  assert.equal(reversal.reversalOf, 'entry-001');
  assert.equal(reversal.lines[0].direction, LedgerDirection.CREDIT);
  assert.equal(reversal.lines[1].direction, LedgerDirection.DEBIT);
});

test('State Machines enforce strict domain lifecycles', () => {
  // Bill
  assert.equal(BillStateMachine.canTransition(BillStatus.DRAFT, BillStatus.ISSUED), true);
  assert.equal(BillStateMachine.canTransition(BillStatus.PAID, BillStatus.DRAFT), false);

  // Payment
  assert.equal(PaymentStateMachine.canTransition(PaymentStatus.INITIATED, PaymentStatus.PROCESSING), true);
  assert.equal(PaymentStateMachine.canTransition(PaymentStatus.SUCCESS, PaymentStatus.FAILED), false);

  // Payroll
  assert.equal(PayrollRunStateMachine.canTransition(PayrollRunStatus.DRAFT, PayrollRunStatus.PENDING_APPROVAL), true);
  assert.equal(PayrollRunStateMachine.canTransition(PayrollRunStatus.PENDING_APPROVAL, PayrollRunStatus.APPROVED), true);
  assert.equal(PayrollRunStateMachine.canTransition(PayrollRunStatus.APPROVED, PayrollRunStatus.FUNDS_RESERVED), true);

  // Payout
  assert.equal(PayoutStateMachine.canTransition(PayoutStatus.PENDING, PayoutStatus.SENT), true);
  assert.equal(PayoutStateMachine.canTransition(PayoutStatus.SENT, PayoutStatus.UNKNOWN), true);

  // Cross-border
  assert.equal(CrossBorderStateMachine.canTransition(CrossBorderStatus.QUOTED, CrossBorderStatus.APPROVED), true);
  assert.equal(CrossBorderStateMachine.canTransition(CrossBorderStatus.PAYING_OUT, CrossBorderStatus.PAYOUT_FAILED_FUNDS_HELD), true);
});
