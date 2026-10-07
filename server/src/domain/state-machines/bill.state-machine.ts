import { BillStatus } from '../../shared/index.js';

export class InvalidBillTransitionError extends Error {
  constructor(from: BillStatus, to: BillStatus) {
    super(`Illegal Bill transition from ${from} to ${to}`);
    this.name = 'InvalidBillTransitionError';
  }
}

export class BillStateMachine {
  private static readonly transitions: Record<BillStatus, BillStatus[]> = {
    [BillStatus.DRAFT]: [BillStatus.ISSUED, BillStatus.CANCELLED],
    [BillStatus.ISSUED]: [BillStatus.PARTIALLY_PAID, BillStatus.PAID, BillStatus.OVERDUE, BillStatus.CANCELLED],
    [BillStatus.PARTIALLY_PAID]: [BillStatus.PARTIALLY_PAID, BillStatus.PAID, BillStatus.OVERDUE],
    [BillStatus.PAID]: [BillStatus.REFUNDED],
    [BillStatus.OVERDUE]: [BillStatus.PARTIALLY_PAID, BillStatus.PAID, BillStatus.CANCELLED],
    [BillStatus.CANCELLED]: [],
    [BillStatus.REFUNDED]: [],
  };

  static canTransition(from: BillStatus, to: BillStatus): boolean {
    return this.transitions[from]?.includes(to) ?? false;
  }

  static transition(from: BillStatus, to: BillStatus): BillStatus {
    if (!this.canTransition(from, to)) {
      throw new InvalidBillTransitionError(from, to);
    }
    return to;
  }
}
